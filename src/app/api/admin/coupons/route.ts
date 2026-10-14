import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET() {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count only approved orders per coupon
  const couponIds = (data ?? []).map((c) => c.id);
  const { data: orderRows } = couponIds.length
    ? await supabase
        .from("orders")
        .select("coupon_id, total_cents, discount_cents")
        .in("coupon_id", couponIds)
        .in("status", ["approved", "shipped", "delivered"])
    : { data: [] };

  const couponStats = new Map<string, { count: number; sales: number; discount: number }>();
  for (const row of orderRows ?? []) {
    if (!row.coupon_id) continue;
    const existing = couponStats.get(row.coupon_id) ?? { count: 0, sales: 0, discount: 0 };
    existing.count += 1;
    existing.sales += row.total_cents;
    existing.discount += row.discount_cents;
    couponStats.set(row.coupon_id, existing);
  }

  const enriched = (data ?? []).map((coupon) => {
    const stats = couponStats.get(coupon.id) ?? { count: 0, sales: 0, discount: 0 };
    return {
      ...coupon,
      approved_usage_count: stats.count,
      total_sales_cents: stats.sales,
      total_discount_cents: stats.discount,
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  let body: {
    code: string;
    type: string;
    value: number;
    min_order_cents?: number;
    apply_to_shipping?: boolean;
    max_uses?: number | null;
    max_uses_per_user?: number | null;
    reseller_user_id?: string | null;
    commission_percent?: number | null;
    active?: boolean;
    expires_at?: string | null;
    persistence_days?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.code || !body.type || typeof body.value !== "number" || body.value < 0) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (!["percentage", "fixed"].includes(body.type)) {
    return NextResponse.json(
      { error: "Invalid coupon type" },
      { status: 400 }
    );
  }

  // Cookie persistence window (days). Only a superadmin may set it; regular
  // admins always create coupons with the default window. Clamped to 1–365.
  const persistenceDays =
    adminResult.role === "superadmin" &&
    typeof body.persistence_days === "number" &&
    Number.isFinite(body.persistence_days)
      ? Math.min(365, Math.max(1, Math.round(body.persistence_days)))
      : 30;

  const supabase = createServerClient();

  if (body.reseller_user_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reseller } = await (supabase as any)
      .from("resellers")
      .select("user_id")
      .eq("user_id", body.reseller_user_id)
      .maybeSingle();

    if (!reseller) {
      try {
        const client = await clerkClient();
        await client.users.getUser(body.reseller_user_id);
      } catch {
        return NextResponse.json(
          { error: "Invalid reseller user id" },
          { status: 400 }
        );
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("coupons")
    .insert({
      code: body.code.toUpperCase(),
      type: body.type,
      value: body.value,
      min_order_cents: body.min_order_cents ?? 0,
      apply_to_shipping: body.apply_to_shipping ?? false,
      max_uses: body.max_uses ?? null,
      max_uses_per_user: body.max_uses_per_user ?? null,
      reseller_user_id: body.reseller_user_id ?? null,
      commission_percent: body.commission_percent ?? null,
      active: body.active ?? true,
      expires_at: body.expires_at ?? null,
      persistence_days: persistenceDays,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
