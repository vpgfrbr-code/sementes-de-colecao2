import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET() {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, status, total_cents, discount_cents, subtotal_cents, customer_name, guest_email, clerk_user_id, coupon_id, address, exchange_rate_used, total_brl_cents, payment_proof_path, tracking_code, shipping_carrier, internal_notes, manual_reseller_user_id, manual_commission_percent, manual_reseller_assigned_at, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  // Fallback if manual reseller columns don't exist yet (migration 039 not applied)
  if (error?.message?.includes("manual_reseller_user_id")) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("orders")
      .select(
        "id, status, total_cents, discount_cents, subtotal_cents, customer_name, guest_email, clerk_user_id, coupon_id, address, exchange_rate_used, total_brl_cents, payment_proof_path, tracking_code, shipping_carrier, internal_notes, created_at, updated_at"
      )
      .order("created_at", { ascending: false });
    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    }
    return NextResponse.json(fallbackData);
  }

  // Fallback if payment_proof_path column doesn't exist yet
  if (error?.message?.includes("payment_proof_path")) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("orders")
      .select(
        "id, status, total_cents, discount_cents, subtotal_cents, customer_name, guest_email, clerk_user_id, coupon_id, address, exchange_rate_used, total_brl_cents, created_at, updated_at"
      )
      .order("created_at", { ascending: false });
    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    }
    return NextResponse.json(fallbackData);
  }

  // Fallback if internal_notes column doesn't exist yet (migration 035 not applied)
  if (error?.message?.includes("internal_notes")) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("orders")
      .select(
        "id, status, total_cents, discount_cents, subtotal_cents, customer_name, guest_email, clerk_user_id, coupon_id, address, exchange_rate_used, total_brl_cents, payment_proof_path, tracking_code, shipping_carrier, created_at, updated_at"
      )
      .order("created_at", { ascending: false });
    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    }
    return NextResponse.json(fallbackData);
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with coupon codes so the list can display them (admin read-only,
  // superadmin editable). Uses a second lightweight query to avoid introducing
  // a PostgREST embedded select in the primary query above.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];
  const couponIds = Array.from(
    new Set(
      rows
        .map((o) => o.coupon_id as string | null)
        .filter((v): v is string => !!v)
    )
  );
  if (couponIds.length > 0) {
    const { data: coupons } = await supabase
      .from("coupons")
      .select("id, code")
      .in("id", couponIds);
    const codeById = new Map(
      (coupons ?? []).map((c) => [c.id as string, c.code as string])
    );
    const enriched = rows.map((o) => ({
      ...o,
      coupon_code: o.coupon_id ? codeById.get(o.coupon_id) ?? null : null,
    }));
    return NextResponse.json(enriched);
  }

  return NextResponse.json(rows.map((o) => ({ ...o, coupon_code: null })));
}
