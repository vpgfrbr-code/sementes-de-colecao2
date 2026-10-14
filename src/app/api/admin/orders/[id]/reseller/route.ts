import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireSuperAdmin, isAdminError } from "@/lib/admin";

/**
 * PATCH /api/admin/orders/[id]/reseller
 * Superadmin-only: manually attribute an order to a reseller for commission
 * reporting. Passing `reseller_user_id: null` clears the attribution.
 * Does NOT change any pricing — attribution is a commission tag only.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireSuperAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;

  let body: {
    reseller_user_id?: string | null;
    commission_percent?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Clearing the attribution
  const clearing =
    body.reseller_user_id === null || body.reseller_user_id === undefined;

  if (clearing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("orders")
      .update({
        manual_reseller_user_id: null,
        manual_commission_percent: null,
        manual_reseller_assigned_by: null,
        manual_reseller_assigned_at: null,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, cleared: true });
  }

  // Setting / updating the attribution
  const resellerUserId = body.reseller_user_id;
  const commissionPercent = Number(body.commission_percent);

  if (!resellerUserId || typeof resellerUserId !== "string") {
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

  // Validate reseller exists and is active
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reseller } = await (supabase as any)
    .from("resellers")
    .select("user_id, status")
    .eq("user_id", resellerUserId)
    .single();

  if (!reseller) {
    return NextResponse.json(
      { error: "Reseller not found" },
      { status: 404 }
    );
  }

  if (reseller.status !== "active") {
    return NextResponse.json(
      { error: "Reseller is not active" },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("orders")
    .update({
      manual_reseller_user_id: resellerUserId,
      manual_commission_percent: commissionPercent,
      manual_reseller_assigned_by: adminResult.userId,
      manual_reseller_assigned_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
