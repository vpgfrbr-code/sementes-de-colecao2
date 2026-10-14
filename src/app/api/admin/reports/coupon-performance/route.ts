import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabase = createServerClient();

  // Get all active coupons
  const { data: coupons } = await supabase
    .from("coupons")
    .select("id, code, type, value, used_count, active, reseller_name")
    .order("used_count", { ascending: false });

  if (!coupons || coupons.length === 0) {
    return NextResponse.json({ coupons: [] });
  }

  const couponIds = coupons.map((c) => c.id);

  // Get orders using these coupons
  let ordersQuery = supabase
    .from("orders")
    .select("coupon_id, total_cents, subtotal_cents, discount_cents, status")
    .in("coupon_id", couponIds)
    .in("status", ["approved", "shipped", "delivered"]);

  if (from) ordersQuery = ordersQuery.gte("created_at", from);
  if (to) ordersQuery = ordersQuery.lte("created_at", `${to}T23:59:59.999Z`);

  const { data: orders } = await ordersQuery;

  // Aggregate by coupon
  const ordersByCoupon = new Map<
    string,
    { order_count: number; revenue_cents: number; discount_cents: number }
  >();

  for (const order of orders ?? []) {
    if (!order.coupon_id) continue;
    const existing = ordersByCoupon.get(order.coupon_id) ?? {
      order_count: 0,
      revenue_cents: 0,
      discount_cents: 0,
    };
    existing.order_count += 1;
    existing.revenue_cents += order.total_cents;
    existing.discount_cents += order.discount_cents;
    ordersByCoupon.set(order.coupon_id, existing);
  }

  const result = coupons.map((coupon) => {
    const stats = ordersByCoupon.get(coupon.id) ?? {
      order_count: 0,
      revenue_cents: 0,
      discount_cents: 0,
    };
    return {
      coupon_id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      active: coupon.active,
      is_reseller: !!coupon.reseller_name,
      reseller_name: coupon.reseller_name,
      total_uses: coupon.used_count,
      order_count: stats.order_count,
      revenue_cents: stats.revenue_cents,
      discount_cents: stats.discount_cents,
    };
  });

  // Sort by revenue generated
  result.sort((a, b) => b.revenue_cents - a.revenue_cents);

  return NextResponse.json({ coupons: result });
}
