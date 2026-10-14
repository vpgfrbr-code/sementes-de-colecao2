import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET() {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const supabase = createServerClient();
  const now = new Date();

  // Date boundaries
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString();

  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();

  const lastMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  ).toISOString();

  const lastMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
    999
  ).toISOString();

  // 7 days ago
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const weekStart = new Date(
    sevenDaysAgo.getFullYear(),
    sevenDaysAgo.getMonth(),
    sevenDaysAgo.getDate()
  ).toISOString();

  const COMPLETED = ["approved", "shipped", "delivered"];

  const [
    { count: ordersToday },
    { data: revenueThisMonth },
    { data: revenueLastMonth },
    { count: pendingCount },
    { count: activeProducts },
    { count: activeCoupons },
    { data: last7DaysOrders },
    { data: allCompletedOrders },
  ] = await Promise.all([
    // Orders today
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart),

    // Revenue this month (completed)
    supabase
      .from("orders")
      .select("total_cents")
      .in("status", COMPLETED)
      .gte("created_at", monthStart),

    // Revenue last month (completed)
    supabase
      .from("orders")
      .select("total_cents")
      .in("status", COMPLETED)
      .gte("created_at", lastMonthStart)
      .lte("created_at", lastMonthEnd),

    // Pending orders
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["waiting_payment", "payment_reported"]),

    // Active products
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("active", true),

    // Active coupons
    supabase
      .from("coupons")
      .select("*", { count: "exact", head: true })
      .eq("active", true),

    // Last 7 days orders for sparkline (completed)
    supabase
      .from("orders")
      .select("total_cents, created_at")
      .in("status", COMPLETED)
      .gte("created_at", weekStart)
      .order("created_at", { ascending: true }),

    // All completed for avg ticket + top products + top states
    supabase
      .from("orders")
      .select("id, total_cents, address")
      .in("status", COMPLETED),
  ]);

  // Revenue this month
  const revenueThisMonthCents =
    revenueThisMonth?.reduce((s, o) => s + o.total_cents, 0) ?? 0;

  // Revenue last month
  const revenueLastMonthCents =
    revenueLastMonth?.reduce((s, o) => s + o.total_cents, 0) ?? 0;

  // Month-over-month delta
  const revenueDelta =
    revenueLastMonthCents > 0
      ? Math.round(
          ((revenueThisMonthCents - revenueLastMonthCents) /
            revenueLastMonthCents) *
            100
        )
      : revenueThisMonthCents > 0
        ? 100
        : 0;

  // Average ticket
  const avgTicket =
    allCompletedOrders && allCompletedOrders.length > 0
      ? Math.round(
          allCompletedOrders.reduce((s, o) => s + o.total_cents, 0) /
            allCompletedOrders.length
        )
      : 0;

  // Sparkline: last 7 days revenue by day
  const sparkline: { day: string; revenue_cents: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const dayKey = d.toISOString().slice(0, 10);
    sparkline.push({ day: dayKey, revenue_cents: 0 });
  }
  for (const order of last7DaysOrders ?? []) {
    const dayKey = new Date(order.created_at).toISOString().slice(0, 10);
    const bucket = sparkline.find((s) => s.day === dayKey);
    if (bucket) bucket.revenue_cents += order.total_cents;
  }

  // Top 3 states from completed orders
  const stateMap = new Map<string, number>();
  for (const order of allCompletedOrders ?? []) {
    const addr = order.address as { state?: string } | null;
    const state = addr?.state?.toUpperCase();
    if (state) {
      stateMap.set(state, (stateMap.get(state) ?? 0) + 1);
    }
  }
  const topStates = Array.from(stateMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([state, count]) => ({ state, order_count: count }));

  // Top 3 products
  const completedOrderIds = (allCompletedOrders ?? []).map((o) => o.id);
  let topProducts: { product_id: string; name: string; quantity: number; total_seeds: number }[] =
    [];

  if (completedOrderIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, variant_id, quantity")
      .in("order_id", completedOrderIds);

    if (items && items.length > 0) {
      // Fetch seed_count for each variant
      const variantIds = [...new Set(items.filter((i) => i.variant_id).map((i) => i.variant_id as string))];
      const variantSeedMap = new Map<string, number>();
      if (variantIds.length > 0) {
        const { data: variants } = await supabase
          .from("product_variants")
          .select("id, seed_count")
          .in("id", variantIds);
        for (const v of variants ?? []) {
          variantSeedMap.set(v.id, v.seed_count);
        }
      }

      const prodMap = new Map<string, { quantity: number; total_seeds: number }>();
      for (const item of items) {
        const existing = prodMap.get(item.product_id) ?? { quantity: 0, total_seeds: 0 };
        const seedCount = item.variant_id ? (variantSeedMap.get(item.variant_id) ?? 0) : 0;
        existing.quantity += item.quantity;
        existing.total_seeds += item.quantity * seedCount;
        prodMap.set(item.product_id, existing);
      }
      const topProductIds = Array.from(prodMap.entries())
        .sort((a, b) => b[1].quantity - a[1].quantity)
        .slice(0, 3);

      const { data: translations } = await supabase
        .from("product_translations")
        .select("product_id, name")
        .in(
          "product_id",
          topProductIds.map(([id]) => id)
        )
        .eq("locale", "pt");

      const nameMap = new Map<string, string>();
      for (const t of translations ?? []) {
        nameMap.set(t.product_id, t.name);
      }

      topProducts = topProductIds.map(([id, data]) => ({
        product_id: id,
        name: nameMap.get(id) ?? "—",
        quantity: data.quantity,
        total_seeds: data.total_seeds,
      }));
    }
  }

  return NextResponse.json({
    orders_today: ordersToday ?? 0,
    revenue_this_month: revenueThisMonthCents,
    revenue_delta: revenueDelta,
    avg_ticket: avgTicket,
    pending_orders: pendingCount ?? 0,
    active_products: activeProducts ?? 0,
    active_coupons: activeCoupons ?? 0,
    sparkline,
    top_products: topProducts,
    top_states: topStates,
  });
}
