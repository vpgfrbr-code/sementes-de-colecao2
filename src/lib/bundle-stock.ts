import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mutates each "bundle" product in `products` so that its `stock` reflects
 * the effective availability derived from its component products:
 *
 *     effectiveStock = floor(min(component.stock / seed_count))
 *
 * Bundle products store `stock = 0` in the database by design — real
 * availability lives in the component products. Pages that render product
 * cards based on `product.stock` must call this before rendering.
 *
 * Returns the same array reference for convenience.
 */
export async function applyBundleEffectiveStock<
  T extends { id: string; product_type?: string | null; stock?: number | null }
>(supabase: SupabaseClient, products: T[]): Promise<T[]> {
  const bundleIds = products
    .filter((p) => p.product_type === "bundle")
    .map((p) => p.id);

  if (bundleIds.length === 0) return products;

  const { data: bundleComponents } = await supabase
    .from("bundle_components")
    .select("bundle_product_id, component_product_id, seed_count")
    .in("bundle_product_id", bundleIds);

  const componentIds = [
    ...new Set((bundleComponents ?? []).map((c) => c.component_product_id as string)),
  ];

  const { data: componentProducts } = componentIds.length > 0
    ? await supabase.from("products").select("id, stock").in("id", componentIds)
    : { data: [] as { id: string; stock: number }[] };

  const componentStockMap = new Map(
    (componentProducts ?? []).map((p) => [p.id as string, (p.stock as number) ?? 0])
  );

  for (const product of products) {
    if (product.product_type !== "bundle") continue;
    const comps = (bundleComponents ?? []).filter(
      (c) => c.bundle_product_id === product.id
    );
    if (comps.length === 0) {
      (product as { stock: number }).stock = 0;
      continue;
    }
    const effectiveStock = Math.floor(
      Math.min(
        ...comps.map(
          (c) =>
            (componentStockMap.get(c.component_product_id as string) ?? 0) /
            (c.seed_count as number)
        )
      )
    );
    (product as { stock: number }).stock = effectiveStock;
  }

  return products;
}
