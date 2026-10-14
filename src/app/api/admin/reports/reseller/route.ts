import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabase = createServerClient();

  // Get all reseller coupons
  const { data: resellerCoupons } = await supabase
    .from("coupons")
    .select(
      "id, code, reseller_user_id, reseller_name, reseller_email, commission_percent"
    )
    .or("reseller_name.not.is.null,reseller_user_id.not.is.null");

  const hasResellerCoupons = !!resellerCoupons && resellerCoupons.length > 0;
  const couponIds = hasResellerCoupons
    ? resellerCoupons!.map((c) => c.id)
    : [];

  const resellerUserIds = Array.from(
    new Set(
      (resellerCoupons ?? [])
        .map((coupon) => coupon.reseller_user_id)
        .filter((userId): userId is string => !!userId)
    )
  );

  const resellerUsers = new Map<string, { name: string; email: string }>();
  if (resellerUserIds.length > 0) {
    const client = await clerkClient();
    await Promise.all(
      resellerUserIds.map(async (userId) => {
        try {
          const user = await client.users.getUser(userId);
          const name =
            user.fullName?.trim() ||
            [user.firstName?.trim(), user.lastName?.trim()]
              .filter(Boolean)
              .join(" ") ||
            user.username ||
            user.emailAddresses[0]?.emailAddress ||
            userId;
          resellerUsers.set(userId, {
            name,
            email: user.emailAddresses[0]?.emailAddress ?? "",
          });
        } catch {
          resellerUsers.set(userId, { name: userId, email: "" });
        }
      })
    );
  }

  // Get orders with reseller coupons in date range
  let orders: Array<{
    id: string;
    total_cents: number;
    subtotal_cents: number;
    discount_cents: number;
    coupon_id: string | null;
    status: string;
    created_at: string;
    commission_payout_id: string | null;
    commission_paid_cents: number | null;
  }> = [];
  if (hasResellerCoupons) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("orders")
      .select("id, total_cents, subtotal_cents, discount_cents, coupon_id, status, created_at, commission_payout_id, commission_paid_cents")
      .in("coupon_id", couponIds)
      .neq("status", "cancelled");

    if (from) {
      query = query.gte("created_at", from);
    }
    if (to) {
      query = query.lte("created_at", `${to}T23:59:59.999Z`);
    }

    const { data } = await query;
    orders = data ?? [];
  }

  // Get orders with a MANUAL reseller attribution in date range
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let manualQuery = (supabase as any)
    .from("orders")
    .select(
      "id, total_cents, subtotal_cents, discount_cents, coupon_id, status, created_at, manual_reseller_user_id, manual_commission_percent, commission_payout_id, commission_paid_cents"
    )
    .not("manual_reseller_user_id", "is", null)
    .neq("status", "cancelled");

  if (from) manualQuery = manualQuery.gte("created_at", from);
  if (to) manualQuery = manualQuery.lte("created_at", `${to}T23:59:59.999Z`);

  const { data: manualOrdersRaw } = await manualQuery;
  const manualOrders = (manualOrdersRaw ?? []) as Array<{
    id: string;
    total_cents: number;
    subtotal_cents: number;
    discount_cents: number;
    manual_reseller_user_id: string;
    manual_commission_percent: number;
    commission_payout_id: string | null;
    commission_paid_cents: number | null;
  }>;

  // Resolve Clerk users for any manual-only reseller IDs not already resolved
  const manualUserIds = Array.from(
    new Set(manualOrders.map((o) => o.manual_reseller_user_id))
  );
  const missingUserIds = manualUserIds.filter((uid) => !resellerUsers.has(uid));
  if (missingUserIds.length > 0) {
    const client = await clerkClient();
    await Promise.all(
      missingUserIds.map(async (userId) => {
        try {
          const user = await client.users.getUser(userId);
          const name =
            user.fullName?.trim() ||
            [user.firstName?.trim(), user.lastName?.trim()]
              .filter(Boolean)
              .join(" ") ||
            user.username ||
            user.emailAddresses[0]?.emailAddress ||
            userId;
          resellerUsers.set(userId, {
            name,
            email: user.emailAddresses[0]?.emailAddress ?? "",
          });
        } catch {
          resellerUsers.set(userId, { name: userId, email: "" });
        }
      })
    );
  }

  // Aggregate by reseller
  const resellerMap = new Map<
    string,
    {
      reseller_user_id: string | null;
      coupon_id: string | null;
      reseller_name: string;
      reseller_email: string;
      coupon_code: string;
      commission_percent: number;
      order_count: number;
      gross_sales: number;
      total_discounts: number;
      commission_value: number;
      paid_value: number;
      pending_value: number;
      manual_orders: number;
    }
  >();

  for (const coupon of resellerCoupons ?? []) {
    const couponOrders = orders.filter((o) => o.coupon_id === coupon.id);
    const grossSales = couponOrders.reduce(
      (sum, o) => sum + o.subtotal_cents,
      0
    );
    const totalDiscounts = couponOrders.reduce(
      (sum, o) => sum + o.discount_cents,
      0
    );
    const commissionPercent = Number(coupon.commission_percent) || 0;
    const netSales = couponOrders.reduce((sum, o) => sum + o.total_cents, 0);
    const commissionValue = Math.round(
      (netSales * commissionPercent) / 100
    );

    const resellerFromClerk = coupon.reseller_user_id
      ? resellerUsers.get(coupon.reseller_user_id)
      : null;
    const resellerName =
      coupon.reseller_name ?? resellerFromClerk?.name ?? "Sem nome";
    const resellerEmail = coupon.reseller_email ?? resellerFromClerk?.email ?? "";

    const paidValueRange = couponOrders
      .filter((o) => o.commission_payout_id)
      .reduce((sum, o) => sum + (o.commission_paid_cents ?? 0), 0);

    resellerMap.set(coupon.id, {
      reseller_user_id: coupon.reseller_user_id ?? null,
      coupon_id: coupon.id,
      reseller_name: resellerName,
      reseller_email: resellerEmail,
      coupon_code: coupon.code,
      commission_percent: commissionPercent,
      order_count: couponOrders.length,
      gross_sales: grossSales,
      total_discounts: totalDiscounts,
      commission_value: commissionValue,
      paid_value: paidValueRange,
      pending_value: 0, // computed below from all-time pending
      manual_orders: 0,
    });
  }

  // Aggregate manual-attributed orders into a per-reseller row (one combined
  // row per user, keyed so it does not collide with coupon rows).
  for (const mo of manualOrders) {
    const key = `manual:${mo.manual_reseller_user_id}`;
    const pct = Number(mo.manual_commission_percent) || 0;
    const commission = Math.round((mo.total_cents * pct) / 100);
    const paidThis = mo.commission_payout_id
      ? mo.commission_paid_cents ?? 0
      : 0;
    const existing = resellerMap.get(key);
    const userInfo = resellerUsers.get(mo.manual_reseller_user_id);
    if (existing) {
      existing.order_count += 1;
      existing.manual_orders += 1;
      existing.gross_sales += mo.subtotal_cents;
      existing.total_discounts += mo.discount_cents;
      existing.commission_value += commission;
      existing.paid_value += paidThis;
    } else {
      resellerMap.set(key, {
        reseller_user_id: mo.manual_reseller_user_id,
        coupon_id: null,
        reseller_name: userInfo?.name ?? mo.manual_reseller_user_id,
        reseller_email: userInfo?.email ?? "",
        coupon_code: "—",
        commission_percent: pct,
        order_count: 1,
        manual_orders: 1,
        gross_sales: mo.subtotal_cents,
        total_discounts: mo.discount_cents,
        commission_value: commission,
        paid_value: paidThis,
        pending_value: 0,
      });
    }
  }

  const resellers = Array.from(resellerMap.values()).filter(
    (r) => r.order_count > 0
  );

  // Compute ALL-TIME pending commission per row (ignoring date range), so
  // the UI shows a stable "what is owed right now" number regardless of the
  // selected period. We query unpaid non-cancelled orders for each row's
  // attribution (coupon_id and/or manual_reseller_user_id).
  const allCouponIds = resellers
    .map((r) => r.coupon_id)
    .filter((x): x is string => !!x);
  const allManualUserIds = resellers
    .filter((r) => r.coupon_id === null && r.reseller_user_id)
    .map((r) => r.reseller_user_id as string);

  const pendingByCoupon = new Map<string, number>();
  if (allCouponIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pendingRows } = await (supabase as any)
      .from("orders")
      .select(
        "coupon_id, total_cents, manual_commission_percent"
      )
      .in("coupon_id", allCouponIds)
      .neq("status", "cancelled")
      .is("commission_payout_id", null);
    const couponPctMap = new Map<string, number>();
    for (const c of resellerCoupons ?? []) {
      couponPctMap.set(c.id, Number(c.commission_percent) || 0);
    }
    for (const row of (pendingRows ?? []) as Array<{
      coupon_id: string;
      total_cents: number;
      manual_commission_percent: number | null;
    }>) {
      const pct =
        row.manual_commission_percent != null
          ? Number(row.manual_commission_percent)
          : couponPctMap.get(row.coupon_id) ?? 0;
      const cents = Math.round((row.total_cents * pct) / 100);
      pendingByCoupon.set(
        row.coupon_id,
        (pendingByCoupon.get(row.coupon_id) ?? 0) + cents
      );
    }
  }

  const pendingByManualUser = new Map<string, number>();
  if (allManualUserIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pendingRows } = await (supabase as any)
      .from("orders")
      .select("manual_reseller_user_id, total_cents, manual_commission_percent")
      .in("manual_reseller_user_id", allManualUserIds)
      .neq("status", "cancelled")
      .is("commission_payout_id", null);
    for (const row of (pendingRows ?? []) as Array<{
      manual_reseller_user_id: string;
      total_cents: number;
      manual_commission_percent: number | null;
    }>) {
      const pct = Number(row.manual_commission_percent ?? 0);
      const cents = Math.round((row.total_cents * pct) / 100);
      pendingByManualUser.set(
        row.manual_reseller_user_id,
        (pendingByManualUser.get(row.manual_reseller_user_id) ?? 0) + cents
      );
    }
  }

  for (const r of resellers) {
    if (r.coupon_id) {
      r.pending_value = pendingByCoupon.get(r.coupon_id) ?? 0;
    } else if (r.reseller_user_id) {
      r.pending_value = pendingByManualUser.get(r.reseller_user_id) ?? 0;
    }
  }

  const totals = {
    sales: resellers.reduce((s, r) => s + r.gross_sales, 0),
    discounts: resellers.reduce((s, r) => s + r.total_discounts, 0),
    commissions: resellers.reduce((s, r) => s + r.commission_value, 0),
    paid: resellers.reduce((s, r) => s + r.paid_value, 0),
    pending: resellers.reduce((s, r) => s + r.pending_value, 0),
  };

  return NextResponse.json({ resellers, totals });
}
