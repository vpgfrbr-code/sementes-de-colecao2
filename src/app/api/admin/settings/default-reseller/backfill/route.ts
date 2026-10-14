import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireSuperAdmin, isAdminError } from "@/lib/admin";

/**
 * POST /api/admin/settings/default-reseller/backfill
 *
 * Superadmin-only. Retroactively attributes existing orders to a reseller
 * for commission reporting. Only touches orders that:
 *   - have NO coupon applied (coupon_id IS NULL)
 *   - have NO manual reseller already assigned
 *   - are not cancelled
 *
 * Body: { reseller_user_id: string, commission_percent: number,
 *         from?: ISO, to?: ISO, dry_run?: boolean }
 */
export async function POST(req: NextRequest) {
  const adminResult = await requireSuperAdmin();
  if (isAdminError(adminResult)) return adminResult;

  let body: {
    reseller_user_id?: string;
    commission_percent?: number;
    from?: string;
    to?: string;
    dry_run?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const resellerUserId = body.reseller_user_id;
  const commissionPercent = Number(body.commission_percent);

  if (!resellerUserId) {
    return NextResponse.json(
      { error: "reseller_user_id is required" },
      { status: 400 }
    );
  }
  if (
    !Number.isFinite(commissionPercent) ||
    commissionPercent < 0 ||
    commissionPercent > 100
  ) {
    return NextResponse.json(
      { error: "commission_percent must be between 0 and 100" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reseller } = await (supabase as any)
    .from("resellers")
    .select("user_id, status")
    .eq("user_id", resellerUserId)
    .single();

  if (!reseller) {
    return NextResponse.json({ error: "Reseller not found" }, { status: 404 });
  }
  if (reseller.status !== "active") {
    return NextResponse.json(
      { error: "Reseller is not active" },
      { status: 400 }
    );
  }

  // Count eligible orders first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let countQuery = (supabase as any)
    .from("orders")
    .select("id", { count: "exact", head: true })
    .is("coupon_id", null)
    .is("manual_reseller_user_id", null)
    .neq("status", "cancelled");

  if (body.from) countQuery = countQuery.gte("created_at", body.from);
  if (body.to) countQuery = countQuery.lte("created_at", `${body.to}T23:59:59.999Z`);

  const { count } = await countQuery;

  if (body.dry_run) {
    return NextResponse.json({ eligible_orders: count ?? 0, dry_run: true });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let update = (supabase as any)
    .from("orders")
    .update({
      manual_reseller_user_id: resellerUserId,
      manual_commission_percent: commissionPercent,
      manual_reseller_assigned_by: adminResult.userId,
      manual_reseller_assigned_at: new Date().toISOString(),
    })
    .is("coupon_id", null)
    .is("manual_reseller_user_id", null)
    .neq("status", "cancelled");

  if (body.from) update = update.gte("created_at", body.from);
  if (body.to) update = update.lte("created_at", `${body.to}T23:59:59.999Z`);

  const { error } = await update;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated_orders: count ?? 0 });
}
