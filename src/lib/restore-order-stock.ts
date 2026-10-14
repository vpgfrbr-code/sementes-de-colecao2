import { createServerClient } from "@/lib/supabase/server";

/**
 * Restores seed stock for a cancelled/refunded order.
 * For bundle products, stock is restored to the individual components
 * (matching the same expansion logic used at checkout).
 *
 * The SQL function public.restore_order_stock (migration 052, used by the
 * pg_cron job that cancels expired PIX orders) mirrors this logic — keep
 * both in sync.
 */
export async function restoreOrderStock(
  orderId: string,
  supabase: ReturnType<typeof createServerClient>
) {
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("product_id, variant_id, quantity")
    .eq("order_id", orderId);

  if (!orderItems || orderItems.length === 0) return;

  // Fetch seed_count + product_type for variants and products
  const variantIds = orderItems
    .filter((i) => i.variant_id)
    .map((i) => i.variant_id!);

  const productIds = [...new Set(orderItems.map((i) => i.product_id))];

  const [{ data: variants }, { data: products }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, seed_count")
      .in("id", variantIds.length > 0 ? variantIds : ["__none__"]),
    supabase
      .from("products")
      .select("id, product_type")
      .in("id", productIds),
  ]);

  const seedCountMap = new Map((variants ?? []).map((v) => [v.id, v.seed_count]));
  const productTypeMap = new Map(
    (products ?? []).map((p) => [p.id, p.product_type ?? "standard"])
  );

  // Fetch bundle components for any bundle products present
  const bundleIds = productIds.filter(
    (id) => productTypeMap.get(id) === "bundle"
  );

  type BundleComponent = {
    bundle_product_id: string;
    component_product_id: string;
    seed_count: number;
  };
  let bundleComponents: BundleComponent[] = [];
  if (bundleIds.length > 0) {
    const { data: components } = await supabase
      .from("bundle_components")
      .select("bundle_product_id, component_product_id, seed_count")
      .in("bundle_product_id", bundleIds);
    bundleComponents = (components ?? []) as BundleComponent[];
  }

  // Aggregate seeds to restore per physical product (components, not bundles)
  const restoreByProduct = new Map<string, number>();
  for (const item of orderItems) {
    if (productTypeMap.get(item.product_id) === "bundle") {
      // Expand bundle into components
      const comps = bundleComponents.filter(
        (c) => c.bundle_product_id === item.product_id
      );
      for (const comp of comps) {
        restoreByProduct.set(
          comp.component_product_id,
          (restoreByProduct.get(comp.component_product_id) ?? 0) +
            comp.seed_count * item.quantity
        );
      }
    } else {
      const seedCount = item.variant_id
        ? (seedCountMap.get(item.variant_id) ?? 1)
        : 1;
      const seeds = seedCount * item.quantity;
      restoreByProduct.set(
        item.product_id,
        (restoreByProduct.get(item.product_id) ?? 0) + seeds
      );
    }
  }

  for (const [productId, seedsToRestore] of restoreByProduct) {
    await supabase.rpc("restore_product_stock", {
      p_product_id: productId,
      p_seed_quantity: seedsToRestore,
    });
  }
}
