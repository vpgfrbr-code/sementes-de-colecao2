import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireSuperAdmin, isAdminError } from "@/lib/admin";

/**
 * PATCH /api/admin/orders/[id]/coupon
 * Superadmin-only: change the coupon applied to an order. Does NOT
 * recalculate buyer totals (discount_cents / total_cents stay as-is);
 * only affects reseller commission attribution and historical display.
 *
 * Body: { coupon_code: string | null }  // null/"" clears the coupon.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireSuperAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;

  let body: { coupon_code?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServerClient();
  const raw = body.coupon_code;
  const clearing = raw === null || raw === undefined || raw === "";

  let couponId: string | null = null;
  let couponCode: string | null = null;

  if (!clearing) {
    const code = String(raw).trim().toUpperCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: coupon } = await (supabase as any)
      .from("coupons")
      .select("id, code")
      .eq("code", code)
      .single();
    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }
    couponId = coupon.id;
    couponCode = coupon.code;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("orders")
    .update({ coupon_id: couponId })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    coupon_id: couponId,
    coupon_code: couponCode,
  });
}
