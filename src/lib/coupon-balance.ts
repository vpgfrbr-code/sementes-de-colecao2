import type { SupabaseClient } from "@supabase/supabase-js";

interface CouponForBalance {
  id: string;
  type: string;
  value: number;
}

interface BalancedResult {
  couponId: string;
  swapped: boolean;
}

interface Candidate {
  id: string;
  type: string;
  value: number;
  max_uses: number | null;
  used_count: number;
}

/**
 * Finds the best coupon in a balance group based on lowest total approved sales.
 * A coupon can belong to multiple groups — we check all active groups it's in.
 * Returns the original coupon if no group, group is inactive,
 * or the original already has the lowest sales.
 */
export async function findBalancedCoupon(
  supabase: SupabaseClient,
  originalCoupon: CouponForBalance
): Promise<BalancedResult> {
  // Find all active groups this coupon belongs to
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memberships } = await (supabase as any)
    .from("coupon_balance_group_members")
    .select("group_id")
    .eq("coupon_id", originalCoupon.id);

  if (!memberships || memberships.length === 0) {
    return { couponId: originalCoupon.id, swapped: false };
  }

  const groupIds = memberships.map((m: { group_id: string }) => m.group_id);

  // Check which groups are active
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: activeGroups } = await (supabase as any)
    .from("coupon_balance_groups")
    .select("id")
    .in("id", groupIds)
    .eq("active", true);

  if (!activeGroups || activeGroups.length === 0) {
    return { couponId: originalCoupon.id, swapped: false };
  }

  const activeGroupIds = activeGroups.map((g: { id: string }) => g.id);

  // Get all coupon IDs in those active groups
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allMembers } = await (supabase as any)
    .from("coupon_balance_group_members")
    .select("coupon_id")
    .in("group_id", activeGroupIds);

  if (!allMembers || allMembers.length === 0) {
    return { couponId: originalCoupon.id, swapped: false };
  }

  const candidateIds = [...new Set(allMembers.map((m: { coupon_id: string }) => m.coupon_id))];

  // Fetch candidate coupons — same type+value, active, non-expired
  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: candidates } = await (supabase as any)
    .from("coupons")
    .select("id, type, value, max_uses, used_count")
    .in("id", candidateIds)
    .eq("active", true)
    .eq("type", originalCoupon.type)
    .eq("value", originalCoupon.value)
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  if (!candidates || candidates.length <= 1) {
    return { couponId: originalCoupon.id, swapped: false };
  }

  // Filter out coupons that have hit max_uses
  const available = (candidates as Candidate[]).filter(
    (c) => c.max_uses === null || c.used_count < c.max_uses
  );

  if (available.length === 0) {
    return { couponId: originalCoupon.id, swapped: false };
  }

  // Get approved order totals for each candidate
  const availableIds = available.map((c) => c.id);
  const { data: orderStats } = await supabase
    .from("orders")
    .select("coupon_id, total_cents")
    .in("coupon_id", availableIds)
    .in("status", ["approved", "shipped", "delivered"]);

  // Aggregate sales and order count per coupon
  const salesMap = new Map<string, { sales: number; count: number }>();
  for (const id of availableIds) {
    salesMap.set(id, { sales: 0, count: 0 });
  }
  for (const row of orderStats ?? []) {
    if (!row.coupon_id) continue;
    const entry = salesMap.get(row.coupon_id);
    if (entry) {
      entry.sales += row.total_cents;
      entry.count += 1;
    }
  }

  // Sort: lowest sales first, then lowest order count as tiebreaker
  available.sort((a: Candidate, b: Candidate) => {
    const sa = salesMap.get(a.id) ?? { sales: 0, count: 0 };
    const sb = salesMap.get(b.id) ?? { sales: 0, count: 0 };
    if (sa.sales !== sb.sales) return sa.sales - sb.sales;
    return sa.count - sb.count;
  });

  const best = available[0];
  if (!best) {
    return { couponId: originalCoupon.id, swapped: false };
  }
  return {
    couponId: best.id,
    swapped: best.id !== originalCoupon.id,
  };
}
