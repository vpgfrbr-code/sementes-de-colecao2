import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireSuperAdmin, isAdminError } from "@/lib/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireSuperAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id: groupId } = await params;

  let body: { couponId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.couponId) {
    return NextResponse.json({ error: "couponId is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Verify group exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group } = await (supabase as any)
    .from("coupon_balance_groups")
    .select("id")
    .eq("id", groupId)
    .single();

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Verify coupon exists
  const { data: coupon } = await supabase
    .from("coupons")
    .select("id, type, value")
    .eq("id", body.couponId)
    .single();

  if (!coupon) {
    return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  }

  // Validate same type+value as existing members
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingMemberRows } = await (supabase as any)
    .from("coupon_balance_group_members")
    .select("coupon_id")
    .eq("group_id", groupId)
    .limit(1);

  if (existingMemberRows && existingMemberRows.length > 0) {
    const { data: firstCoupon } = await supabase
      .from("coupons")
      .select("type, value")
      .eq("id", existingMemberRows[0].coupon_id)
      .single();

    if (firstCoupon && (firstCoupon.type !== coupon.type || firstCoupon.value !== coupon.value)) {
      return NextResponse.json(
        { error: "Coupon must have the same discount type and value as other members" },
        { status: 400 }
      );
    }
  }

  // Insert into junction table (UNIQUE constraint prevents duplicates)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("coupon_balance_group_members")
    .insert({ group_id: groupId, coupon_id: body.couponId });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Coupon already in this group" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireSuperAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id: groupId } = await params;
  const { searchParams } = new URL(req.url);
  const couponId = searchParams.get("couponId");

  if (!couponId) {
    return NextResponse.json({ error: "couponId query param is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("coupon_balance_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("coupon_id", couponId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
