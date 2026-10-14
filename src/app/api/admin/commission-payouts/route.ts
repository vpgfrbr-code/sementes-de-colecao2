import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

type PayoutMethod = "pix" | "transferencia" | "dinheiro" | "outro";
const METHODS: ReadonlySet<PayoutMethod> = new Set([
  "pix",
  "transferencia",
  "dinheiro",
  "outro",
]);

type OrderRow = {
  id: string;
  total_cents: number;
  subtotal_cents: number;
  discount_cents: number;
  status: string;
  coupon_id: string | null;
  manual_reseller_user_id: string | null;
  manual_commission_percent: number | null;
  commission_payout_id: string | null;
};

type CouponRow = {
  id: string;
  code: string;
  reseller_user_id: string | null;
  reseller_name: string | null;
  reseller_email: string | null;
  commission_percent: number | null;
};

function calcCommissionForOrder(
  order: Pick<OrderRow, "total_cents" | "manual_commission_percent">,
  couponPercent: number | null
): number {
  // Manual attribution overrides coupon when present (matches report logic).
  const pct =
    order.manual_commission_percent != null
      ? Number(order.manual_commission_percent)
      : Number(couponPercent ?? 0);
  if (!pct) return 0;
  return Math.round((order.total_cents * pct) / 100);
}

export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { searchParams } = new URL(req.url);
  const resellerUserId = searchParams.get("reseller_user_id");
  const couponId = searchParams.get("coupon_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("commission_payouts")
    .select(
      "id, reseller_user_id, coupon_id, reseller_name, reseller_email, total_cents, method, reference, notes, paid_at, created_by, created_at"
    )
    .order("paid_at", { ascending: false });

  if (resellerUserId) query = query.eq("reseller_user_id", resellerUserId);
  if (couponId) query = query.eq("coupon_id", couponId);
  if (from) query = query.gte("paid_at", from);
  if (to) query = query.lte("paid_at", `${to}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with order count per payout
  const ids = (data ?? []).map((p: { id: string }) => p.id);
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orderRows } = await (supabase as any)
      .from("orders")
      .select("commission_payout_id")
      .in("commission_payout_id", ids);
    for (const row of (orderRows ?? []) as Array<{
      commission_payout_id: string;
    }>) {
      counts.set(
        row.commission_payout_id,
        (counts.get(row.commission_payout_id) ?? 0) + 1
      );
    }
  }

  const payouts = (data ?? []).map(
    (p: { id: string } & Record<string, unknown>) => ({
      ...p,
      order_count: counts.get(p.id) ?? 0,
    })
  );

  return NextResponse.json({ payouts });
}

export async function POST(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  let body: {
    reseller_user_id?: string | null;
    coupon_id?: string | null;
    order_ids?: string[];
    paid_at?: string;
    method?: string;
    reference?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderIds = Array.isArray(body.order_ids)
    ? body.order_ids.filter((x) => typeof x === "string" && x.length > 0)
    : [];
  if (orderIds.length === 0) {
    return NextResponse.json(
      { error: "order_ids is required and must be non-empty" },
      { status: 400 }
    );
  }
  if (!body.paid_at) {
    return NextResponse.json({ error: "paid_at is required" }, { status: 400 });
  }
  const method = body.method as PayoutMethod;
  if (!METHODS.has(method)) {
    return NextResponse.json(
      { error: "method must be one of pix, transferencia, dinheiro, outro" },
      { status: 400 }
    );
  }
  const resellerUserId = body.reseller_user_id || null;
  const couponId = body.coupon_id || null;
  if (!resellerUserId && !couponId) {
    return NextResponse.json(
      { error: "Either reseller_user_id or coupon_id must be provided" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Load orders + verify they all belong to the target and are unpaid.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ordersData, error: ordersErr } = await (supabase as any)
    .from("orders")
    .select(
      "id, total_cents, subtotal_cents, discount_cents, status, coupon_id, manual_reseller_user_id, manual_commission_percent, commission_payout_id"
    )
    .in("id", orderIds);

  if (ordersErr) {
    return NextResponse.json({ error: ordersErr.message }, { status: 500 });
  }
  const orders = (ordersData ?? []) as OrderRow[];
  if (orders.length !== orderIds.length) {
    return NextResponse.json(
      { error: "One or more orders not found" },
      { status: 404 }
    );
  }

  // Idempotency: refuse if any order already has a payout.
  const alreadyPaid = orders.filter((o) => o.commission_payout_id);
  if (alreadyPaid.length > 0) {
    return NextResponse.json(
      {
        error: "Some orders already have a commission payout",
        order_ids: alreadyPaid.map((o) => o.id),
      },
      { status: 409 }
    );
  }

  const cancelled = orders.filter((o) => o.status === "cancelled");
  if (cancelled.length > 0) {
    return NextResponse.json(
      {
        error: "Cancelled orders cannot have commission paid",
        order_ids: cancelled.map((o) => o.id),
      },
      { status: 400 }
    );
  }

  // Load coupon to compute commission percent when needed
  const couponIdsToLoad = new Set<string>();
  if (couponId) couponIdsToLoad.add(couponId);
  for (const o of orders) {
    if (o.manual_commission_percent == null && o.coupon_id) {
      couponIdsToLoad.add(o.coupon_id);
    }
  }

  const couponMap = new Map<string, CouponRow>();
  if (couponIdsToLoad.size > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: coupons } = await (supabase as any)
      .from("coupons")
      .select(
        "id, code, reseller_user_id, reseller_name, reseller_email, commission_percent"
      )
      .in("id", Array.from(couponIdsToLoad));
    for (const c of (coupons ?? []) as CouponRow[]) couponMap.set(c.id, c);
  }

  // Verify each order belongs to the target reseller/coupon.
  for (const o of orders) {
    if (resellerUserId) {
      // Order matches if (manual_reseller_user_id == resellerUserId)
      // OR (its coupon's reseller_user_id == resellerUserId).
      const couponReseller = o.coupon_id
        ? couponMap.get(o.coupon_id)?.reseller_user_id
        : null;
      const ok =
        o.manual_reseller_user_id === resellerUserId ||
        couponReseller === resellerUserId;
      if (!ok) {
        return NextResponse.json(
          {
            error: "Order does not belong to the specified reseller",
            order_id: o.id,
          },
          { status: 400 }
        );
      }
    } else if (couponId) {
      // Coupon-only path: require the coupon match (legacy coupons w/o user_id).
      if (o.coupon_id !== couponId) {
        return NextResponse.json(
          {
            error: "Order does not belong to the specified coupon",
            order_id: o.id,
          },
          { status: 400 }
        );
      }
    }
  }

  // Compute commission per order and total.
  const perOrderCommission = new Map<string, number>();
  let totalCents = 0;
  for (const o of orders) {
    const couponPct =
      o.coupon_id != null
        ? couponMap.get(o.coupon_id)?.commission_percent ?? null
        : null;
    const cents = calcCommissionForOrder(o, couponPct);
    perOrderCommission.set(o.id, cents);
    totalCents += cents;
  }

  // Resolve reseller name/email snapshot.
  let resellerName = "";
  let resellerEmail = "";
  if (resellerUserId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(resellerUserId);
      resellerName =
        user.fullName?.trim() ||
        [user.firstName?.trim(), user.lastName?.trim()]
          .filter(Boolean)
          .join(" ") ||
        user.username ||
        user.emailAddresses[0]?.emailAddress ||
        resellerUserId;
      resellerEmail = user.emailAddresses[0]?.emailAddress ?? "";
    } catch {
      resellerName = resellerUserId;
    }
  } else if (couponId) {
    const c = couponMap.get(couponId);
    resellerName = c?.reseller_name ?? "";
    resellerEmail = c?.reseller_email ?? "";
  }

  // Insert payout header
  const paidAtIso = new Date(body.paid_at).toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payout, error: insertErr } = await (supabase as any)
    .from("commission_payouts")
    .insert({
      reseller_user_id: resellerUserId,
      coupon_id: couponId,
      reseller_name: resellerName,
      reseller_email: resellerEmail,
      total_cents: totalCents,
      method,
      reference: body.reference ?? "",
      notes: body.notes ?? "",
      paid_at: paidAtIso,
      created_by: adminResult.userId,
    })
    .select("id")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Update each order with snapshot + payout link.
  // We do per-order updates so commission_paid_cents reflects the per-order value.
  for (const o of orders) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updErr } = await (supabase as any)
      .from("orders")
      .update({
        commission_payout_id: payout.id,
        commission_paid_at: paidAtIso,
        commission_paid_cents: perOrderCommission.get(o.id) ?? 0,
      })
      .eq("id", o.id)
      .is("commission_payout_id", null);
    if (updErr) {
      // Best-effort rollback: delete the payout header.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("orders")
        .update({
          commission_payout_id: null,
          commission_paid_at: null,
          commission_paid_cents: null,
        })
        .eq("commission_payout_id", payout.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("commission_payouts")
        .delete()
        .eq("id", payout.id);
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { id: payout.id, total_cents: totalCents, order_count: orders.length },
    { status: 201 }
  );
}
