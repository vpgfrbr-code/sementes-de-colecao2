import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireSuperAdmin, isAdminError } from "@/lib/admin";

export async function GET() {
  const adminResult = await requireSuperAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const supabase = createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: groups, error } = await (supabase as any)
    .from("coupon_balance_groups")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch member coupon IDs via junction table
  const groupIds = (groups ?? []).map((g: { id: string }) => g.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memberRows } = groupIds.length
    ? await (supabase as any)
        .from("coupon_balance_group_members")
        .select("group_id, coupon_id")
        .in("group_id", groupIds)
    : { data: [] };

  const couponIds: string[] = Array.from(new Set((memberRows ?? []).map((r: { coupon_id: string }) => r.coupon_id as string)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: coupons } = couponIds.length
    ? await (supabase as any)
        .from("coupons")
        .select("id, code, type, value, active, max_uses, used_count, expires_at")
        .in("id", couponIds)
    : { data: [] };

  // Fetch approved order totals for member coupons
  const { data: orderRows } = couponIds.length
    ? await supabase
        .from("orders")
        .select("coupon_id, total_cents")
        .in("coupon_id", couponIds)
        .in("status", ["approved", "shipped", "delivered"])
    : { data: [] };

  const salesMap = new Map<string, number>();
  for (const row of orderRows ?? []) {
    if (!row.coupon_id) continue;
    salesMap.set(row.coupon_id, (salesMap.get(row.coupon_id) ?? 0) + row.total_cents);
  }

  // Build coupon lookup map
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const couponMap = new Map((coupons ?? []).map((c: any) => [c.id, c]));

  // Build group → members mapping from junction rows
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichedGroups = (groups ?? []).map((group: any) => {
    const groupMemberRows = (memberRows ?? []).filter(
      (r: { group_id: string }) => r.group_id === group.id
    );
    const members = groupMemberRows
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: { coupon_id: string }) => couponMap.get(r.coupon_id))
      .filter(Boolean)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) => ({
        ...c,
        total_sales_cents: salesMap.get(c.id) ?? 0,
      }));
    return { ...group, members };
  });

  return NextResponse.json(enrichedGroups);
}

export async function POST(req: NextRequest) {
  const adminResult = await requireSuperAdmin();
  if (isAdminError(adminResult)) return adminResult;

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: insertError } = await (supabase as any)
    .from("coupon_balance_groups")
    .insert({ name: body.name.trim() })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
