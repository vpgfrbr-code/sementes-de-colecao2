import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;
  const supabase = createServerClient();

  // Fetch reseller
  const { data: reseller, error: resellerError } = await supabase
    .from("resellers" as never)
    .select("id, user_id, display_name, email, status, notes, created_at, activated_at" as never)
    .eq("id" as never, id as never)
    .single();

  if (resellerError || !reseller) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const r = reseller as {
    id: string;
    user_id: string;
    display_name: string;
    email: string;
    status: string;
    notes: string;
    created_at: string;
    activated_at: string | null;
  };

  // Fetch coupons belonging to this reseller
  const { data: coupons } = await supabase
    .from("coupons")
    .select("id, code, commission_percent, type, value, active")
    .eq("reseller_user_id" as never, r.user_id as never);

  const couponList = (coupons ?? []) as {
    id: string;
    code: string;
    commission_percent: number | null;
    type: string;
    value: number;
    active: boolean;
  }[];

  const couponIds = couponList.map((c) => c.id);

  let orders: {
    id: string;
    status: string;
    total_cents: number;
    subtotal_cents: number;
    discount_cents: number;
    coupon_id: string;
    created_at: string;
  }[] = [];

  if (couponIds.length > 0) {
    const { data: orderRows } = await supabase
      .from("orders")
      .select("id, status, total_cents, subtotal_cents, discount_cents, coupon_id, created_at")
      .in("coupon_id", couponIds)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });

    orders = (orderRows ?? []) as typeof orders;
  }

  // Summary
  const totalSalesCents = orders.reduce((s, o) => s + o.total_cents, 0);
  const totalCommissionCents = couponList.reduce((sum, coupon) => {
    const couponOrders = orders.filter((o) => o.coupon_id === coupon.id);
    const commissionPercent = Number(coupon.commission_percent) || 0;
    const net = couponOrders.reduce((s, o) => s + o.total_cents, 0);
    return sum + Math.round((net * commissionPercent) / 100);
  }, 0);

  return NextResponse.json({
    reseller: r,
    coupons: couponList,
    orders,
    summary: {
      order_count: orders.length,
      total_sales_cents: totalSalesCents,
      total_commission_cents: totalCommissionCents,
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;

  let body: { status?: "pending" | "active" | "inactive"; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServerClient();

  const update: Record<string, unknown> = {};
  if (body.status !== undefined) {
    update.status = body.status;
    if (body.status === "active") {
      update.activated_at = new Date().toISOString();
    }
  }
  if (body.notes !== undefined) update.notes = body.notes;

  const { error } = await supabase
    .from("resellers" as never)
    .update(update as never)
    .eq("id" as never, id as never);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase.from("resellers").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
