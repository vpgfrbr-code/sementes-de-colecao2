import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

/**
 * Returns all unpaid (commission_payout_id IS NULL) non-cancelled orders
 * attributable to a given reseller (by Clerk user id) and/or coupon.
 *
 * Query params (one is required):
 *   - reseller_user_id: include orders where coupon.reseller_user_id matches
 *     OR orders.manual_reseller_user_id matches.
 *   - coupon_id: include orders where orders.coupon_id matches.
 */
export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { searchParams } = new URL(req.url);
  const resellerUserId = searchParams.get("reseller_user_id");
  const couponId = searchParams.get("coupon_id");

  if (!resellerUserId && !couponId) {
    return NextResponse.json(
      { error: "reseller_user_id or coupon_id is required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Resolve coupon ids associated with this reseller (if user-id mode).
  const couponIds: string[] = [];
  if (couponId) couponIds.push(couponId);
  if (resellerUserId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: coupons } = await (supabase as any)
      .from("coupons")
      .select("id")
      .eq("reseller_user_id", resellerUserId);
    for (const c of (coupons ?? []) as Array<{ id: string }>) {
      if (!couponIds.includes(c.id)) couponIds.push(c.id);
    }
  }

  type OrderRow = {
    id: string;
    customer_name: string | null;
    total_cents: number;
    subtotal_cents: number;
    discount_cents: number;
    status: string;
    created_at: string;
    coupon_id: string | null;
    manual_reseller_user_id: string | null;
    manual_commission_percent: number | null;
  };

  const orderMap = new Map<string, OrderRow>();

  if (couponIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("orders")
      .select(
        "id, customer_name, total_cents, subtotal_cents, discount_cents, status, created_at, coupon_id, manual_reseller_user_id, manual_commission_percent"
      )
      .in("coupon_id", couponIds)
      .neq("status", "cancelled")
      .is("commission_payout_id", null);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    for (const o of (data ?? []) as OrderRow[]) orderMap.set(o.id, o);
  }

  if (resellerUserId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("orders")
      .select(
        "id, customer_name, total_cents, subtotal_cents, discount_cents, status, created_at, coupon_id, manual_reseller_user_id, manual_commission_percent"
      )
      .eq("manual_reseller_user_id", resellerUserId)
      .neq("status", "cancelled")
      .is("commission_payout_id", null);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    for (const o of (data ?? []) as OrderRow[]) orderMap.set(o.id, o);
  }

  // Load coupon commission_percent for relevant coupons.
  const couponPctIds = Array.from(
    new Set(
      Array.from(orderMap.values())
        .map((o) => o.coupon_id)
        .filter((x): x is string => !!x)
    )
  );
  const couponPctMap = new Map<string, number>();
  if (couponPctIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: coupons } = await (supabase as any)
      .from("coupons")
      .select("id, commission_percent, code")
      .in("id", couponPctIds);
    for (const c of (coupons ?? []) as Array<{
      id: string;
      commission_percent: number | null;
    }>) {
      couponPctMap.set(c.id, Number(c.commission_percent ?? 0));
    }
  }

  const orders = Array.from(orderMap.values()).map((o) => {
    const pct =
      o.manual_commission_percent != null
        ? Number(o.manual_commission_percent)
        : o.coupon_id
          ? couponPctMap.get(o.coupon_id) ?? 0
          : 0;
    const commissionCents = Math.round((o.total_cents * pct) / 100);
    return {
      id: o.id,
      customer_name: o.customer_name,
      total_cents: o.total_cents,
      subtotal_cents: o.subtotal_cents,
      discount_cents: o.discount_cents,
      status: o.status,
      created_at: o.created_at,
      commission_percent: pct,
      commission_cents: commissionCents,
      attribution: o.manual_reseller_user_id ? "manual" : "coupon",
    };
  });

  orders.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const total_cents = orders.reduce((s, o) => s + o.commission_cents, 0);

  return NextResponse.json({ orders, total_cents });
}
