import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabase = createServerClient();

  let query = supabase
    .from("orders")
    .select("total_cents, created_at")
    .in("status", ["approved", "shipped", "delivered"]);

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);

  const { data: orders } = await query;

  if (!orders || orders.length === 0) {
    return NextResponse.json({ overall: 0, by_month: [] });
  }

  const overall =
    Math.round(
      orders.reduce((sum, o) => sum + o.total_cents, 0) / orders.length
    );

  // Group by month
  const monthMap = new Map<string, { total: number; count: number }>();

  for (const order of orders) {
    const date = new Date(order.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthMap.get(key) ?? { total: 0, count: 0 };
    existing.total += order.total_cents;
    existing.count += 1;
    monthMap.set(key, existing);
  }

  const byMonth = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({
      month,
      average_cents: Math.round(data.total / data.count),
      order_count: data.count,
    }));

  return NextResponse.json({ overall, by_month: byMonth });
}
