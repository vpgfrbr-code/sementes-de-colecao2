export interface ShopProduct {
  id: string;
  slug: string;
  product_type: string;
  images: string[];
  stock: number;
  shipping_cents: number;
  seed_type: string | null;
  seed_bank_id: string | null;
  category_id: string | null;
  flavors?: string[] | null;
  on_sale?: boolean;
  discount_type?: string | null;
  discount_value?: number | null;
  sale_ends_at?: string | null;
  variant_discounts_enabled?: boolean;
  product_translations: {
    name: string;
    description: string;
  }[];
  product_variants: {
    id: string;
    seed_count: number;
    price_cents: number;
    stock: number;
    on_sale?: boolean;
    discount_type?: string | null;
    discount_value?: number | null;
    sale_ends_at?: string | null;
  }[];
  product_terpenes?: { is_dominant: boolean; terpenes: { id: string; name: string; color: string } | null }[];
  categories: {
    id: string;
    slug: string;
    category_translations: { name: string }[];
  } | null;
}

export interface CategoryItem {
  id: string;
  slug: string;
  category_translations: { name: string }[];
}

export interface SeedBankItem {
  id: string;
  slug: string;
  seed_bank_translations: { name: string }[];
}

export interface TerpeneItem {
  id: string;
  slug: string;
  name: string;
  color: string;
}

export type SortOption = "popularity" | "name-asc" | "name-desc" | "price-asc" | "price-desc";
export type Availability = "available" | "unavailable";
export type CycleType = "automatic" | "fast-flowering" | "photoperiod";
export type SeedTypeFilter = "feminized" | "regular";

export interface ShopFilters {
  sort: SortOption;
  availability: Availability | null;
  cycleType: CycleType | null;
  packSizes: number[];
  seedType: SeedTypeFilter | null;
  categoryIds: string[];
  seedBankId: string | null;
  priceMin: number | null;
  priceMax: number | null;
}

export const DEFAULT_FILTERS: ShopFilters = {
  sort: "popularity",
  availability: null,
  cycleType: null,
  packSizes: [],
  seedType: null,
  categoryIds: [],
  seedBankId: null,
  priceMin: null,
  priceMax: null,
};

/* ── Derive cycle type from product fields ── */
export function deriveCycleType(product: ShopProduct): CycleType {
  if (product.seed_type === "autoflower") return "automatic";
  const catSlug = product.categories?.slug ?? "";
  if (catSlug.includes("fast-flowering") || catSlug.includes("fast_flowering")) {
    return "fast-flowering";
  }
  return "photoperiod";
}

/* ── Derive effective seed type (autoflower is always feminized) ── */
export function deriveEffectiveSeedType(product: ShopProduct): SeedTypeFilter | null {
  if (product.seed_type === "autoflower" || product.seed_type === "feminized") return "feminized";
  if (product.seed_type === "regular") return "regular";
  return null;
}

/* ── Price helpers ── */
export function getMinPrice(product: ShopProduct): number {
  const prices = product.product_variants.map((v) => v.price_cents);
  return prices.length > 0 ? Math.min(...prices) : 0;
}

export function getTotalStock(product: ShopProduct): number {
  return product.stock;
}

export function getProductName(product: ShopProduct): string {
  return product.product_translations[0]?.name ?? "";
}

/* ── URL param serialization ── */
export function filtersToParams(filters: ShopFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("sort", filters.sort);
  if (filters.availability) params.set("avail", filters.availability);
  if (filters.cycleType) params.set("ciclo", filters.cycleType);
  if (filters.packSizes.length > 0) params.set("pack", filters.packSizes.join(","));
  if (filters.seedType) params.set("tipo", filters.seedType);
  if (filters.categoryIds.length > 0) params.set("cat", filters.categoryIds.join(","));
  if (filters.seedBankId) params.set("banco", filters.seedBankId);
  if (filters.priceMin !== null) params.set("pmin", String(filters.priceMin));
  if (filters.priceMax !== null) params.set("pmax", String(filters.priceMax));

  return params;
}

export function paramsToFilters(params: URLSearchParams): ShopFilters {
  const sort = params.get("sort");
  const avail = params.get("avail");
  const ciclo = params.get("ciclo");
  const pack = params.get("pack");
  const tipo = params.get("tipo");
  const cat = params.get("cat");
  const banco = params.get("banco");
  const pmin = params.get("pmin");
  const pmax = params.get("pmax");

  return {
    sort: (["popularity", "name-asc", "name-desc", "price-asc", "price-desc"] as SortOption[]).includes(sort as SortOption)
      ? (sort as SortOption)
      : DEFAULT_FILTERS.sort,
    availability: avail === "available" || avail === "unavailable" ? avail : null,
    cycleType: (["automatic", "fast-flowering", "photoperiod"] as CycleType[]).includes(ciclo as CycleType)
      ? (ciclo as CycleType)
      : null,
    packSizes: pack
      ? pack.split(",").map(Number).filter((n) => !Number.isNaN(n) && n > 0)
      : [],
    seedType: tipo === "feminized" || tipo === "regular" ? tipo : null,
    categoryIds: cat ? cat.split(",").filter(Boolean) : [],
    seedBankId: banco || null,
    priceMin: pmin ? Number(pmin) : null,
    priceMax: pmax ? Number(pmax) : null,
  };
}
