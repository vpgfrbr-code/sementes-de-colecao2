"use client";

import { useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, SlidersHorizontal, X, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { ShopProductCard } from "./shop-product-card";
import { ShopSidebar } from "./shop-sidebar";
import { DotPattern } from "@/components/ui/dot-pattern";
import { ProductGridSkeleton } from "@/components/skeletons/product-grid-skeleton";
import {
  type ShopProduct,
  type CategoryItem,
  type SeedBankItem,
  type TerpeneItem,
  type ShopFilters,
  type SortOption,
  DEFAULT_FILTERS,
  paramsToFilters,
  filtersToParams,
  deriveCycleType,
  deriveEffectiveSeedType,
  getMinPrice,
  getTotalStock,
  getProductName,
} from "./shop-types";

interface ShopContentProps {
  products: ShopProduct[];
  categories: CategoryItem[];
  seedBanks: SeedBankItem[];
  terpenes: TerpeneItem[];
  reviewAggregates?: Record<string, { average: number; count: number }>;
  salesMap?: Record<string, number>;
}

export function ShopContent(props: ShopContentProps) {
  return (
    <Suspense fallback={<ProductGridSkeleton count={9} columns="3" />}>
      <ShopContentInner {...props} />
    </Suspense>
  );
}

function ShopContentInner({
  products,
  categories,
  seedBanks,
  terpenes,
  reviewAggregates,
  salesMap,
}: ShopContentProps) {
  const t = useTranslations("shop");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(() => paramsToFilters(searchParams), [searchParams]);

  const setFilters = useCallback(
    (next: ShopFilters) => {
      const params = filtersToParams(next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  /* ── Compute derived data ── */
  const allPackSizes = useMemo(() => {
    const sizes = new Set<number>();
    for (const p of products) {
      for (const v of p.product_variants) {
        sizes.add(v.seed_count);
      }
    }
    return Array.from(sizes).sort((a, b) => a - b);
  }, [products]);

  const priceRange = useMemo(() => {
    let min = Infinity;
    let max = 0;
    for (const p of products) {
      const mp = getMinPrice(p);
      if (mp > 0 && mp < min) min = mp;
      if (mp > max) max = mp;
    }
    return { min: min === Infinity ? 0 : min, max };
  }, [products]);

  /* ── Apply filters ── */
  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      // Availability
      if (filters.availability === "available" && getTotalStock(p) <= 0) return false;
      if (filters.availability === "unavailable" && getTotalStock(p) > 0) return false;

      // Cycle type
      if (filters.cycleType && deriveCycleType(p) !== filters.cycleType) return false;

      // Pack size — product must have at least one variant with matching seed_count
      if (
        filters.packSizes.length > 0 &&
        !p.product_variants.some((v) => filters.packSizes.includes(v.seed_count))
      )
        return false;

      // Seed type
      if (filters.seedType && deriveEffectiveSeedType(p) !== filters.seedType) return false;

      // Categories (OR logic across selected)
      if (
        filters.categoryIds.length > 0 &&
        (!p.category_id || !filters.categoryIds.includes(p.category_id))
      )
        return false;

      // Seed bank
      if (filters.seedBankId && p.seed_bank_id !== filters.seedBankId) return false;

      // Price range
      const mp = getMinPrice(p);
      if (filters.priceMin !== null && mp < filters.priceMin) return false;
      if (filters.priceMax !== null && mp > filters.priceMax) return false;

      return true;
    });

    // Sort
    result = [...result].sort((a, b) => {
      switch (filters.sort) {
        case "popularity": {
          const sa = salesMap?.[a.id] ?? 0;
          const sb = salesMap?.[b.id] ?? 0;
          if (sb !== sa) return sb - sa;
          // Tiebreaker: alphabetical for stable ordering when no sales data
          return getProductName(a).localeCompare(getProductName(b));
        }
        case "name-asc":
          return getProductName(a).localeCompare(getProductName(b));
        case "name-desc":
          return getProductName(b).localeCompare(getProductName(a));
        case "price-asc":
          return getMinPrice(a) - getMinPrice(b);
        case "price-desc":
          return getMinPrice(b) - getMinPrice(a);
        default:
          return 0;
      }
    });

    return result;
  }, [products, filters, salesMap]);

  const activeCount = [
    filters.availability,
    filters.cycleType,
    filters.seedType,
    filters.seedBankId,
    filters.packSizes.length > 0 ? true : null,
    filters.categoryIds.length > 0 ? true : null,
    filters.priceMin,
    filters.priceMax,
  ].filter(Boolean).length;

  const sidebarProps = {
    filters,
    onFiltersChange: setFilters,
    categories,
    seedBanks,
    allPackSizes,
    priceRange,
  };

  const sortLabel =
    ({
      popularity: t("sortPopular"),
      "name-asc": t("sortAZ"),
      "name-desc": t("sortZA"),
      "price-asc": t("sortPriceLow"),
      "price-desc": t("sortPriceHigh"),
    } as Record<string, string>)[filters.sort] ?? t("sortPopular");

  /* ── Build active filter pills ── */
  const activePills = useMemo(() => {
    const pills: { key: string; label: string; onRemove: () => void }[] = [];

    if (filters.availability) {
      const label = filters.availability === "available" ? t("available") : t("unavailable");
      pills.push({ key: "availability", label, onRemove: () => setFilters({ ...filters, availability: null }) });
    }
    if (filters.cycleType) {
      const label = { automatic: t("cycleAutomatic"), "fast-flowering": t("cycleFastFlowering"), photoperiod: t("cyclePhotoperiod") }[filters.cycleType];
      pills.push({ key: "cycleType", label, onRemove: () => setFilters({ ...filters, cycleType: null }) });
    }
    if (filters.seedType) {
      const label = filters.seedType === "feminized" ? "Feminizada" : "Regular";
      pills.push({ key: "seedType", label, onRemove: () => setFilters({ ...filters, seedType: null }) });
    }
    if (filters.seedBankId) {
      const sb = seedBanks.find((s) => s.id === filters.seedBankId);
      const label = sb?.seed_bank_translations[0]?.name ?? sb?.slug ?? filters.seedBankId;
      pills.push({ key: "seedBank", label, onRemove: () => setFilters({ ...filters, seedBankId: null }) });
    }
    for (const size of filters.packSizes) {
      pills.push({
        key: `pack-${size}`,
        label: `${size} sem.`,
        onRemove: () => setFilters({ ...filters, packSizes: filters.packSizes.filter((s) => s !== size) }),
      });
    }
    for (const catId of filters.categoryIds) {
      const cat = categories.find((c) => c.id === catId);
      const label = cat?.category_translations[0]?.name ?? cat?.slug ?? catId;
      pills.push({
        key: `cat-${catId}`,
        label,
        onRemove: () => setFilters({ ...filters, categoryIds: filters.categoryIds.filter((c) => c !== catId) }),
      });
    }
    if (filters.priceMin !== null || filters.priceMax !== null) {
      const lo = filters.priceMin !== null ? `$${(filters.priceMin / 100).toFixed(0)}` : `$${(priceRange.min / 100).toFixed(0)}`;
      const hi = filters.priceMax !== null ? `$${(filters.priceMax / 100).toFixed(0)}` : `$${(priceRange.max / 100).toFixed(0)}`;
      pills.push({
        key: "price",
        label: `${lo} – ${hi}`,
        onRemove: () => setFilters({ ...filters, priceMin: null, priceMax: null }),
      });
    }

    return pills;
  }, [filters, seedBanks, categories, priceRange, setFilters, t]);

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Top bar: results count + sort + clear ─── */}
      <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/50">
          {t("results", { count: filtered.length })}
        </p>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 font-mono text-[11px] uppercase tracking-[0.1em]"
              onClick={() => setFilters(DEFAULT_FILTERS)}
            >
              <X className="h-3 w-3" />
              {t("clearFilters")}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-none border-foreground/20 font-mono text-[11px] uppercase tracking-[0.1em]"
              >
                {sortLabel}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none font-mono text-[11px] uppercase tracking-[0.1em]">
              <DropdownMenuRadioGroup
                value={filters.sort}
                onValueChange={(val) =>
                  setFilters({ ...filters, sort: val as SortOption })
                }
              >
                <DropdownMenuRadioItem value="popularity" className="font-mono text-[11px] uppercase tracking-[0.1em]">
                  {t("sortPopular")}
                </DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                <DropdownMenuRadioItem value="name-asc" className="font-mono text-[11px] uppercase tracking-[0.1em]">
                  {t("sortAZ")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name-desc" className="font-mono text-[11px] uppercase tracking-[0.1em]">
                  {t("sortZA")}
                </DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                <DropdownMenuRadioItem value="price-asc" className="font-mono text-[11px] uppercase tracking-[0.1em]">
                  {t("sortPriceLow")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="price-desc" className="font-mono text-[11px] uppercase tracking-[0.1em]">
                  {t("sortPriceHigh")}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ─── Active filter pills ─── */}
      {activePills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activePills.map((pill) => (
            <button
              key={pill.key}
              onClick={pill.onRemove}
              className="flex items-center gap-1.5 border border-foreground bg-foreground px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-background transition-opacity hover:opacity-80"
            >
              {pill.label}
              <X className="h-2.5 w-2.5" />
            </button>
          ))}
        </div>
      )}

      {/* ─── Mobile Filters Button ─── */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="w-full gap-2 rounded-none border-foreground/20 font-mono text-[11px] uppercase tracking-[0.1em]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t("filters")}
              {activeCount > 0 && (
                <span className="ml-1 inline-flex h-5 w-5 items-center justify-center border border-foreground bg-foreground font-mono text-[10px] text-background">
                  {activeCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="flex w-full flex-col p-0 sm:max-w-[300px] rounded-none"
          >
            <SheetHeader className="px-5 pt-5">
              <SheetTitle className="font-display text-sm font-bold uppercase tracking-[0.2em]">
                {t("filters")}
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-5">
              <ShopSidebar {...sidebarProps} />
            </div>
            {/* Footer fixo: sempre mostra "Ver resultados", opcionalmente "Limpar" */}
            <div className="border-t border-foreground/10 p-4 flex gap-2">
              {activeCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 rounded-none border-foreground/20 font-mono text-[11px] uppercase tracking-[0.1em] shrink-0"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                >
                  <X className="h-3 w-3" />
                  {t("clearFilters")}
                </Button>
              )}
              <SheetClose asChild>
                <Button
                  size="sm"
                  className="flex-1 rounded-none font-mono text-[11px] font-bold uppercase tracking-[0.1em]"
                >
                  {t("results", { count: filtered.length })}
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* ─── Sidebar + Content ─── */}
      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden w-[260px] shrink-0 lg:block">
          <div className="sticky top-20 border border-foreground/10 bg-card p-5">
            <DotPattern width={12} height={12} cr={0.5} className="text-foreground opacity-[0.025]" />
            <div className="relative">
              <ShopSidebar {...sidebarProps} />
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="min-w-0 flex-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <SearchX className="mb-4 h-12 w-12" />
              <p className="text-lg">{t("noResults")}</p>
            </div>
          ) : (
            <StaggerGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product, i) => (
                <StaggerItem key={product.id}>
                  <ShopProductCard
                    product={product}
                    reviewAggregate={reviewAggregates?.[product.id]}
                    priority={i < 4}
                  />
                </StaggerItem>
              ))}
            </StaggerGroup>
          )}
        </div>
      </div>
    </div>
  );
}
