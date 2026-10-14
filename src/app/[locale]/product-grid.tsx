"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Filter, X } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  slug: string;
  images: string[];
  stock: number;
  seed_type: string | null;
  seed_bank_id: string | null;
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
  product_terpenes?: { terpene_id: string }[];
}

interface CategoryItem {
  id: string;
  slug: string;
  category_translations: { name: string }[];
}

interface SeedBankItem {
  id: string;
  slug: string;
  seed_bank_translations: { name: string }[];
}

interface TerpeneItem {
  id: string;
  slug: string;
  name: string;
  color: string;
}

interface ProductGridProps {
  products: Product[];
  categories: CategoryItem[];
  seedBanks: SeedBankItem[];
  terpenes: TerpeneItem[];
}

const SEED_TYPES = ["feminized", "regular", "autoflower"] as const;

export function ProductGrid({ products, categories, seedBanks, terpenes }: ProductGridProps) {
  const t = useTranslations("product");
  const ct = useTranslations("common");

  const [seedType, setSeedType] = useState<string | null>(null);
  const [seedBankId, setSeedBankId] = useState<string | null>(null);
  const [terpeneId, setTerpeneId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const activeCount = [seedType, seedBankId, terpeneId].filter(Boolean).length;

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (seedType && p.seed_type !== seedType) return false;
      if (seedBankId && p.seed_bank_id !== seedBankId) return false;
      if (terpeneId && !(p.product_terpenes ?? []).some((pt) => pt.terpene_id === terpeneId)) return false;
      return true;
    });
  }, [products, seedType, seedBankId, terpeneId]);

  function clearFilters() {
    setSeedType(null);
    setSeedBankId(null);
    setTerpeneId(null);
  }

  const hasFilterData = seedBanks.length > 0 || terpenes.length > 0;

  return (
    <div>
      {/* Filter Bar */}
      {hasFilterData && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              className="gap-1.5 rounded-full"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-3.5 w-3.5" />
              {ct("search")}
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeCount}
                </Badge>
              )}
            </Button>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={clearFilters}>
                <X className="h-3 w-3" />
                {ct("remove")}
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="rounded-xl border border-border/50 bg-secondary/20 p-4 space-y-4">
              {/* Seed Type */}
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                  {t("seedType")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {SEED_TYPES.map((st) => (
                    <button
                      key={st}
                      onClick={() => setSeedType(seedType === st ? null : st)}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                        seedType === st
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {t(`seedTypes.${st}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seed Banks */}
              {seedBanks.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                    Seed Bank
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {seedBanks.map((sb) => (
                      <button
                        key={sb.id}
                        onClick={() => setSeedBankId(seedBankId === sb.id ? null : sb.id)}
                        className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                          seedBankId === sb.id
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {sb.seed_bank_translations[0]?.name ?? sb.slug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Terpenes */}
              {terpenes.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                    {t("terpeneProfile")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {terpenes.map((terp) => (
                      <button
                        key={terp.id}
                        onClick={() => setTerpeneId(terpeneId === terp.id ? null : terp.id)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                          terpeneId === terp.id
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: terp.color }}
                        />
                        {terp.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p className="text-lg">Nenhum produto encontrado.</p>
        </div>
      ) : (
        <StaggerGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product, i) => (
            <StaggerItem key={product.id}>
              <ProductCard product={product} priority={i < 4} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </div>
  );
}
