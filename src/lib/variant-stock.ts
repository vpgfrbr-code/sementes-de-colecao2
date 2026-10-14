/**
 * Unified seed-stock helpers.
 *
 * Since migration 028, `products.stock` is the single source of truth — it
 * holds the total number of individual seeds available. Variants (3/5/10
 * seeds, etc.) are just packaging options that all debit from the same pool.
 *
 * `product_variants.stock` is legacy and must NOT be used to determine
 * availability anywhere in the app.
 */

export const LOW_STOCK_PACKS_THRESHOLD = 5;

/**
 * How many packs of `seedCount` seeds can still be sold given the product's
 * current total seed stock. Returns 0 for invalid inputs.
 */
export function variantPacksAvailable(
  productStock: number | null | undefined,
  seedCount: number | null | undefined
): number {
  const stock = Math.max(0, Math.floor(productStock ?? 0));
  const seeds = Math.floor(seedCount ?? 0);
  if (seeds <= 0) return 0;
  return Math.floor(stock / seeds);
}

export function isVariantOutOfStock(
  productStock: number | null | undefined,
  seedCount: number | null | undefined
): boolean {
  return variantPacksAvailable(productStock, seedCount) <= 0;
}

export function isVariantLowStock(
  productStock: number | null | undefined,
  seedCount: number | null | undefined,
  threshold: number = LOW_STOCK_PACKS_THRESHOLD
): boolean {
  const packs = variantPacksAvailable(productStock, seedCount);
  return packs > 0 && packs <= threshold;
}
