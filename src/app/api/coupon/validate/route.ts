import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { findBalancedCoupon } from "@/lib/coupon-balance";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { log } from "@/lib/log";

const CouponValidateSchema = z.object({
  code: z.string().min(1).max(50),
  subtotalCents: z.number().int().positive().max(10_000_000),
  shippingCents: z.number().int().nonnegative().max(1_000_000).optional(),
  email: z.string().email().max(254).nullish(),
  clerkUserId: z.string().max(64).nullish(),
});

export async function POST(req: NextRequest) {
  try {
    return await handleValidate(req);
  } catch (err) {
    // Top-level safety net so the client never sees an empty 500 body.
    log.error("[coupon/validate] unhandled error:", err);
    const message = err instanceof Error ? err.message : "Validation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleValidate(req: NextRequest) {
  // 20 validations / min / IP — blocks coupon code enumeration.
  const rl = await rateLimit(`coupon:${getClientIp(req)}`, 20, 60);
  if (!rl.allowed) return rl.response!;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CouponValidateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const code = parsed.data.code.trim().toUpperCase();
  const subtotalCents = parsed.data.subtotalCents;
  const shippingCents = parsed.data.shippingCents ?? 0;
  const email = parsed.data.email?.trim().toLowerCase() ?? undefined;
  const clerkUserId = parsed.data.clerkUserId ?? undefined;

  const supabase = createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: coupon } = await (supabase as any)
    .from("coupons")
    .select("id, code, type, value, min_order_cents, apply_to_shipping, max_uses, max_uses_per_user, used_count, active, expires_at")
    .eq("code", code)
    .eq("active", true)
    .single();

  if (!coupon) {
    return NextResponse.json(
      { valid: false, reason: "not_found" },
      { status: 200 }
    );
  }

  // Check expiry
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json(
      { valid: false, reason: "expired" },
      { status: 200 }
    );
  }

  let reservedCount = 0;
  if (coupon.max_uses !== null) {
    const { count } = await supabase
      .from("coupon_usage_reservations")
      .select("*", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("status", "reserved");
    reservedCount = count ?? 0;
  }

  // Check max uses (confirmed + reserved slots)
  if (coupon.max_uses !== null && (coupon.used_count + reservedCount) >= coupon.max_uses) {
    return NextResponse.json(
      { valid: false, reason: "max_uses_reached" },
      { status: 200 }
    );
  }

  // Check minimum order (always against subtotal + shipping combined)
  if (subtotalCents + shippingCents < coupon.min_order_cents) {
    return NextResponse.json(
      { valid: false, reason: "min_order_not_met", minOrderCents: coupon.min_order_cents },
      { status: 200 }
    );
  }

  // Check per-user limit if we have user info
  if (coupon.max_uses_per_user !== null && (clerkUserId || email)) {
    let userOrdersCount = 0;
    if (clerkUserId) {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("coupon_id", coupon.id)
        .eq("clerk_user_id", clerkUserId);
      userOrdersCount = count ?? 0;
    } else if (email) {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("coupon_id", coupon.id)
        .eq("guest_email", email);
      userOrdersCount = count ?? 0;
    }

    if (userOrdersCount >= coupon.max_uses_per_user) {
      return NextResponse.json(
        { valid: false, reason: "max_uses_reached" },
        { status: 200 }
      );
    }
  }

  // Calculate discount
  const discountBase = coupon.apply_to_shipping
    ? subtotalCents + shippingCents
    : subtotalCents;

  let discountCents: number;
  if (coupon.type === "percentage") {
    discountCents = Math.round((discountBase * coupon.value) / 100);
  } else {
    // fixed: value is in cents
    discountCents = Math.min(coupon.value, discountBase);
  }

  // Balance group rotation: find the coupon with lowest sales in the group
  const { couponId: balancedCouponId } = await findBalancedCoupon(supabase, coupon);

  return NextResponse.json({
    valid: true,
    couponId: balancedCouponId,
    type: coupon.type,
    value: coupon.value,
    discountCents,
    applyToShipping: coupon.apply_to_shipping,
  });
}
