import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

  const supabase = createServerClient();

  // Get completed orders in date range
  let ordersQuery = supabase
    .from("orders")
    .select("id")
    .in("status", ["approved", "shipped", "delivered"]);

  if (from) ordersQuery = ordersQuery.gte("created_at", from);
  if (to) ordersQuery = ordersQuery.lte("created_at", `${to}T23:59:59.999Z`);

  const { data: orders } = await ordersQuery;
  if (!orders || orders.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const orderIds = orders.map((o) => o.id);

  // Get order items for those orders
  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, variant_id, quantity, unit_price_cents")
    .in("order_id", orderIds);

  if (!items || items.length === 0) {
    return NextResponse.json({ products: [] });
  }

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

  // Aggregate by product
  const productMap = new Map<
    string,
    { quantity: number; revenue: number; total_seeds: number }
  >();

  for (const item of items) {
    const existing = productMap.get(item.product_id) ?? {
      quantity: 0,
      revenue: 0,
      total_seeds: 0,
    };
    const seedCount = item.variant_id ? (variantSeedMap.get(item.variant_id) ?? 0) : 0;
    existing.quantity += item.quantity;
    existing.revenue += item.quantity * item.unit_price_cents;
    existing.total_seeds += item.quantity * seedCount;
    productMap.set(item.product_id, existing);
  }

  // Sort by quantity sold descending
  const sorted = Array.from(productMap.entries())
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, limit);

  const productIds = sorted.map(([id]) => id);

  // Get product names (PT translation as default)
  const { data: translations } = await supabase
    .from("product_translations")
    .select("product_id, name, locale")
    .in("product_id", productIds)
    .eq("locale", "pt");

  const nameMap = new Map<string, string>();
  for (const t of translations ?? []) {
    nameMap.set(t.product_id, t.name);
  }

  // Get product images
  const { data: products } = await supabase
    .from("products")
    .select("id, images, slug")
    .in("id", productIds);

  const productInfoMap = new Map<
    string,
    { image: string | null; slug: string }
  >();
  for (const p of products ?? []) {
    productInfoMap.set(p.id, {
      image: p.images?.[0] ?? null,
      slug: p.slug,
    });
  }

  const result = sorted.map(([id, data]) => ({
    product_id: id,
    name: nameMap.get(id) ?? "Produto desconhecido",
    slug: productInfoMap.get(id)?.slug ?? "",
    image: productInfoMap.get(id)?.image ?? null,
    quantity_sold: data.quantity,
    total_seeds: data.total_seeds,
    revenue_cents: data.revenue,
  }));

  return NextResponse.json({ products: result });
}
