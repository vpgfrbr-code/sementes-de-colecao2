import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";
import type { Database } from "@/lib/supabase/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;
  const supabase = createServerClient();

  const { data: coupon, error: couponError } = await supabase
    .from("coupons")
    .select("*")
    .eq("id", id)
    .single();

  if (couponError || !coupon) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: orderRows } = await supabase
    .from("orders")
    .select("id, status, total_cents, subtotal_cents, discount_cents, customer_name, clerk_user_id, guest_email, created_at")
    .eq("coupon_id", id)
    .in("status", ["approved", "shipped", "delivered"])
    .order("created_at", { ascending: false });

  const orders = (orderRows ?? []) as {
    id: string;
    status: string;
    total_cents: number;
    subtotal_cents: number;
    discount_cents: number;
    customer_name: string | null;
    clerk_user_id: string | null;
    guest_email: string | null;
    created_at: string;
  }[];

  const summary = {
    order_count: orders.length,
    total_discount_cents: orders.reduce((s, o) => s + o.discount_cents, 0),
    total_sales_cents: orders.reduce((s, o) => s + o.total_cents, 0),
  };

  return NextResponse.json({ coupon, orders, summary });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServerClient();

  const allowed = [
    "code",
    "type",
    "value",
    "min_order_cents",
    "apply_to_shipping",
    "max_uses",
    "max_uses_per_user",
    "reseller_user_id",
    "commission_percent",
    "active",
    "expires_at",
    "persistence_days",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      updates[key] = key === "code" ? String(body[key]).toUpperCase() : body[key];
    }
  }

  // Cookie persistence window is superadmin-only. Regular admins can edit every
  // other coupon field, but any persistence_days they send is ignored.
  if ("persistence_days" in updates) {
    if (adminResult.role === "superadmin") {
      const raw = Number(updates.persistence_days);
      updates.persistence_days = Number.isFinite(raw)
        ? Math.min(365, Math.max(1, Math.round(raw)))
        : 30;
    } else {
      delete updates.persistence_days;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  if (typeof updates.reseller_user_id === "string" && updates.reseller_user_id) {
    // Only validate when the reseller_user_id is actually being changed.
    // Re-validating on every edit breaks when the Clerk account was deleted
    // but the reseller record still exists on a historical coupon.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from("coupons")
      .select("reseller_user_id")
      .eq("id", id)
      .maybeSingle();

    const unchanged =
      existing?.reseller_user_id === updates.reseller_user_id;

    if (!unchanged) {
      // Validate against the resellers table (source of truth); fall back to
      // Clerk only if the user isn't in the resellers table yet.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: reseller } = await (supabase as any)
        .from("resellers")
        .select("user_id")
        .eq("user_id", updates.reseller_user_id)
        .maybeSingle();

      if (!reseller) {
        try {
          const client = await clerkClient();
          await client.users.getUser(updates.reseller_user_id as string);
        } catch {
          return NextResponse.json(
            { error: "Invalid reseller user id" },
            { status: 400 }
          );
        }
      }
    }
  }

  const { error } = await supabase
    .from("coupons")
    .update(updates as Database["public"]["Tables"]["coupons"]["Update"])
    .eq("id", id);

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

  const { data: coupon } = await supabase
    .from("coupons")
    .select("used_count")
    .eq("id", id)
    .single();

  if (coupon && coupon.used_count > 0) {
    return NextResponse.json(
      { error: "Cupons com uso não podem ser excluídos, apenas desativados." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("coupons").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
