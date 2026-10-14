import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const granularity = searchParams.get("granularity") ?? "day"; // day | week | month

  const supabase = createServerClient();

  let query = supabase
    .from("orders")
    .select("total_cents, total_brl_cents, created_at")
    .in("status", ["approved", "shipped", "delivered"])
    .order("created_at", { ascending: true });

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);

  const { data: orders } = await query;

  if (!orders || orders.length === 0) {
    return NextResponse.json({ data: [], total_revenue: 0, total_revenue_brl: 0 });
  }

  const bucketMap = new Map<
    string,
    { revenue_cents: number; revenue_brl_cents: number; order_count: number }
  >();

  for (const order of orders) {
    const date = new Date(order.created_at);
    let key: string;

    if (granularity === "month") {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    } else if (granularity === "week") {
      // ISO week start (Monday)
      const d = new Date(date);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      key = d.toISOString().slice(0, 10);
    } else {
      key = date.toISOString().slice(0, 10);
    }

    const existing = bucketMap.get(key) ?? {
      revenue_cents: 0,
      revenue_brl_cents: 0,
      order_count: 0,
    };
    existing.revenue_cents += order.total_cents;
    existing.revenue_brl_cents += order.total_brl_cents ?? 0;
    existing.order_count += 1;
    bucketMap.set(key, existing);
  }

  const data = Array.from(bucketMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, d]) => ({
      period,
      revenue_cents: d.revenue_cents,
      revenue_brl_cents: d.revenue_brl_cents,
      order_count: d.order_count,
    }));

  const totalRevenue = orders.reduce((s, o) => s + o.total_cents, 0);
  const totalRevenueBrl = orders.reduce(
    (s, o) => s + (o.total_brl_cents ?? 0),
    0
  );

  return NextResponse.json({
    data,
    total_revenue: totalRevenue,
    total_revenue_brl: totalRevenueBrl,
  });
}
