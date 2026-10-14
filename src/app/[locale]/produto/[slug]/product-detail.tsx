"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ShoppingBag, Check, Package, Truck, FlaskConical, Pencil, Percent, Flame, Star, Minus, Plus } from "lucide-react";
import { StickyAddToCart } from "@/components/product/sticky-add-to-cart";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { FadeUp } from "@/components/motion";
import { TextAnimate } from "@/components/ui/text-animate";
import { ProductGallery } from "@/components/product/product-gallery";
import { StrainInfo } from "@/components/product/strain-info";
import { StrainMonogram } from "@/components/product/strain-monogram";
import { GeneticsTree } from "@/components/product/genetics-tree";
import { TerpeneProfile } from "@/components/product/terpene-profile";
import { StrainScienceTable } from "@/components/product/strain-science-table";
import { RealPhotos } from "@/components/product/real-photos";
import { FlavorProfile } from "@/components/product/flavor-profile";
import { CropMarks } from "@/components/product/crop-marks";
import { RuledDivider } from "@/components/product/ruled-divider";
import { SpecimenBarcode } from "@/components/product/specimen-barcode";
import { DotPattern } from "@/components/ui/dot-pattern";
import { LazyVideo } from "@/components/lazy-video";
import { useCartStore } from "@/store/cart";
import { useCartConfirmationStore } from "@/store/cart-confirmation";
import { PriceDisplay } from "@/components/price-display";
import { calculateDiscountedPrice, isPromotionActive } from "@/lib/format-price";
import { useLocale, useTranslations } from "next-intl";
import { formatProductSpecimenNo } from "@/lib/product-specimen-code";
import {
  variantPacksAvailable,
  LOW_STOCK_PACKS_THRESHOLD,
} from "@/lib/variant-stock";

interface Variant {
  id: string;
  slug: string;
  seed_count: number;
  price_cents: number;
  stock: number;
  on_sale?: boolean;
  discount_type?: string | null;
  discount_value?: number | null;
  sale_ends_at?: string | null;
}

interface ProductDetailProps {
  product: {
    id: string;
    slug: string;
    product_type?: string;
    specimen_code?: string | null;
    images: string[];
    shipping_cents: number;
    stock: number;
    seed_type: string | null;
    flowering_weeks_min: number | null;
    flowering_weeks_max: number | null;
    thc_min: number | null;
    thc_max: number | null;
    cbd_min: number | null;
    cbd_max: number | null;
    genetics: string | null;
    parent_mother: string | null;
    parent_father: string | null;
    real_photos: string[];
    show_real_photos: boolean;
    seed_bank_id: string | null;
    on_sale?: boolean;
    discount_type?: string | null;
    discount_value?: number | null;
    sale_ends_at?: string | null;
    variant_discounts_enabled?: boolean;
    flavors?: string[] | null;
    seed_banks: {
      id: string;
      slug: string;
      logo_url: string;
      website: string;
      seed_bank_translations: {
        name: string;
        description: string;
      }[];
    } | null;
    product_translations: {
      name: string;
      description: string;
    }[];
    product_variants: Variant[];
    product_terpenes?: {
      is_dominant: boolean;
      terpenes: {
        id: string;
        slug: string;
        name: string;
        aroma: string;
        color: string;
      };
    }[];
    bundle_components?: {
      component_product_id: string;
      seed_count: number;
      products: {
        id: string;
        slug: string;
        stock: number;
        product_translations: { name: string; locale: string }[];
      } | null;
    }[];
  };
  reviewAggregate?: { average: number; count: number };
  strainScienceCardEnabled?: boolean;
}

export function ProductDetail({
  product,
  reviewAggregate,
  strainScienceCardEnabled = true,
}: ProductDetailProps) {
  const locale = useLocale();
  const t = useTranslations("common");
  const pt = useTranslations("product");
  const { user } = useUser();
  const userRole = (user?.publicMetadata as { role?: string })?.role;
  const isAdmin = userRole === "admin" || userRole === "superadmin";
  const addItem = useCartStore((s) => s.addItem);
  const showConfirmation = useCartConfirmationStore((s) => s.show);
  const translation = product.product_translations[0];
  const variants = product.product_variants ?? [];
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    variants[0] ?? null
  );
  const [quantity, setQuantity] = useState(1);
  const [strainVideoError, setStrainVideoError] = useState(false);
  const addToCartButtonRef = useRef<HTMLDivElement>(null);
  // Read last shop filters from sessionStorage so "continue shopping" returns to filtered view.
  const [shopReturnHref, setShopReturnHref] = useState<string>(`/${locale}/loja`);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const qs = window.sessionStorage.getItem("shopFiltersQS");
      const next = qs ? `/${locale}/loja?${qs}` : `/${locale}/loja`;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading one-shot client-only storage on mount
      setShopReturnHref(next);
    } catch {
      // ignore storage errors
    }
  }, [locale]);

  if (!translation) return null;

  const totalStock = product.stock;
  const isBundle = product.product_type === "bundle";
  // For bundles, the variant `seed_count` is intentionally 0 (sentinel used by checkout/stock
  // restore code paths). Compute the displayed total from bundle components.
  const bundleSeedTotal = isBundle
    ? (product.bundle_components ?? []).reduce((sum, c) => sum + (c.seed_count ?? 0), 0)
    : 0;
  const seedCountFor = (v: Variant) => (isBundle ? bundleSeedTotal : v.seed_count);
  // Stock is unified at products.stock (migration 028). For non-bundle products,
  // variant availability = floor(product.stock / variant.seed_count). Bundles use
  // product-level effective stock (already derived from components upstream).
  const selectedPacksAvailable = selectedVariant
    ? isBundle
      ? totalStock
      : variantPacksAvailable(totalStock, selectedVariant.seed_count)
    : 0;
  const outOfStock = isBundle
    ? totalStock <= 0
    : selectedVariant
      ? selectedPacksAvailable <= 0
      : totalStock <= 0;
  const isLowStock =
    !outOfStock &&
    !isBundle &&
    selectedVariant != null &&
    selectedPacksAvailable > 0 &&
    selectedPacksAvailable <= LOW_STOCK_PACKS_THRESHOLD;

  const dominantEntry = product.product_terpenes?.find((t) => t.is_dominant);
  const dominantTerpene = dominantEntry
    ? {
        name: pt.has(`terpenes.${dominantEntry.terpenes.slug}.name`)
          ? pt(`terpenes.${dominantEntry.terpenes.slug}.name` as never)
          : dominantEntry.terpenes.name,
        aroma: pt.has(`terpenes.${dominantEntry.terpenes.slug}.aroma`)
          ? pt(`terpenes.${dominantEntry.terpenes.slug}.aroma` as never)
          : dominantEntry.terpenes.aroma,
        color: dominantEntry.terpenes.color,
      }
    : null;

  // Compute discounted price for a variant
  function getVariantPrices(v: Variant) {
    const productOnSale = isPromotionActive(product.on_sale, product.sale_ends_at);
    // If variant-level discounts enabled, check variant first
    if (product.variant_discounts_enabled && isPromotionActive(v.on_sale, v.sale_ends_at) && v.discount_type && v.discount_value) {
      return {
        displayCents: calculateDiscountedPrice(v.price_cents, v.discount_type, v.discount_value),
        originalCents: v.price_cents,
        hasSale: true,
      };
    }
    // Fall back to product-level discount
    if (productOnSale && product.discount_type && product.discount_value) {
      return {
        displayCents: calculateDiscountedPrice(v.price_cents, product.discount_type, product.discount_value),
        originalCents: v.price_cents,
        hasSale: true,
      };
    }
    return { displayCents: v.price_cents, originalCents: undefined, hasSale: false };
  }

  const selectedPrices = selectedVariant ? getVariantPrices(selectedVariant) : null;

  return (
    <>
      <StickyAddToCart
        anchorRef={addToCartButtonRef}
        productName={translation.name}
        variantLabel={selectedVariant ? `${seedCountFor(selectedVariant)} ${pt("seeds")}` : null}
        priceCents={selectedPrices?.displayCents ?? null}
        originalPriceCents={selectedPrices?.originalCents}
        outOfStock={outOfStock}
        addToCartLabel={t("addToCart")}
        outOfStockLabel={pt("outOfStock")}
        onAddToCart={() => {
          if (!selectedVariant || !selectedPrices) return;
          addItem({
            variantId: selectedVariant.id,
            productId: product.id,
            slug: product.slug,
            name: translation.name,
            variantLabel: `${seedCountFor(selectedVariant)} ${pt("seeds")}`,
            priceCents: selectedPrices.displayCents,
            originalPriceCents: selectedPrices.originalCents,
            shippingCents: product.shipping_cents,
            image: product.images.find((img) => !/\.(mp4|webm|mov)($|\?)/i.test(img)) ?? product.images[0] ?? "",
            video: product.images.find((img) => /\.(mp4|webm|mov)($|\?)/i.test(img)),
          });
          showConfirmation({
            name: translation.name,
            variantLabel: `${seedCountFor(selectedVariant)} ${pt("seeds")}`,
            priceCents: selectedPrices.displayCents,
            originalPriceCents: selectedPrices.originalCents,
            image: product.images.find((img) => !/\.(mp4|webm|mov)($|\?)/i.test(img)) ?? product.images[0] ?? "",
          });
        }}
      />
      {isAdmin && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-4 rounded-full border border-black/10 bg-primary/95 px-5 py-2.5 text-primary-foreground shadow-2xl backdrop-blur-md">
          <span className="hidden md:flex items-center gap-2 text-sm font-medium opacity-90">
            <Pencil className="h-4 w-4" />
            {pt("adminEditBar")}
          </span>
          <Link
            href={`/${locale}/admin/produtos/${product.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-bold transition-colors hover:bg-primary-foreground/30"
          >
            {pt("adminEditAction")}
          </Link>
        </div>
      )}
      <section className="py-8 md:py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Back */}
        <FadeUp>
          <Link
            href={shopReturnHref}
            className="mb-6 -ml-2 inline-flex min-h-[44px] items-center gap-2 rounded-sm px-2 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-foreground/70 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            {t("continueShopping")}
          </Link>
        </FadeUp>

        <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
          {/* Gallery */}
          <FadeUp>
            <ProductGallery
              media={product.images}
              alt={translation.name}
            />
          </FadeUp>

          {/* Info */}
          <FadeUp delay={0.15}>
            <div className="flex flex-col justify-center">
              <div>
                {!outOfStock ? (
                  <span className="mb-4 inline-block -rotate-1 border border-foreground/30 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-foreground/80">
                    <Check className="mr-1 inline h-3 w-3 -mt-0.5" />
                    {pt("inStock")}
                  </span>
                ) : (
                  <span className="mb-4 inline-block -rotate-2 border border-destructive/50 bg-destructive/5 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-destructive">
                    {pt("outOfStock")}
                  </span>
                )}

                {isLowStock && (
                  <span
                    className="mb-4 ml-2 inline-block rotate-1 border border-red-500/60 bg-red-500/10 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-red-700 animate-pulse"
                    aria-live="polite"
                  >
                    <Flame className="mr-1 inline h-3 w-3 -mt-0.5" />
                    {pt("lowStock", { count: selectedPacksAvailable })}
                  </span>
                )}

                {selectedPrices?.hasSale && (
                  <span className="mb-4 ml-2 inline-block rotate-1 border border-red-500/50 bg-red-500/10 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-red-600">
                    <Percent className="mr-1 inline h-3 w-3 -mt-0.5" />
                    {pt("onSale")}
                  </span>
                )}

                <TextAnimate
                  as="h1"
                  animation="blurInUp"
                  by="word"
                  once
                  className="font-display text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl"
                >
                  {translation.name}
                </TextAnimate>
                {reviewAggregate && reviewAggregate.count > 0 && (
                  <a
                    href="#reviews"
                    className="mt-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/70 transition-colors hover:text-foreground"
                  >
                    <span className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => {
                        const filled = reviewAggregate.average >= i - 0.25;
                        return (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${filled ? "fill-foreground text-foreground" : "text-foreground/30"}`}
                          />
                        );
                      })}
                    </span>
                    <span className="font-bold">{reviewAggregate.average.toFixed(1)}</span>
                    <span>({reviewAggregate.count})</span>
                  </a>
                )}
              </div>

              <RuledDivider variant="ornamental" className="my-6" />

              {/* Variant Selector */}
              {variants.length > 0 && (
                <div className="mb-6">
                  <h2 className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/50">
                    {pt("selectVariant")}
                  </h2>
                    <div className="flex flex-wrap gap-2">
                      {variants.map((v) => {
                        const vOut = isBundle
                          ? totalStock <= 0
                          : variantPacksAvailable(totalStock, v.seed_count) <= 0;
                        return (
                        <button
                          key={v.id}
                          onClick={() => { setSelectedVariant(v); setQuantity(1); }}
                          disabled={vOut}
                          className={`relative flex items-center justify-between gap-3 border px-4 py-2 text-left transition-all w-full sm:w-auto flex-1 ${
                            selectedVariant?.id === v.id
                              ? "border-foreground bg-foreground/5 shadow-[inset_0_0_0_1px_currentColor]"
                              : vOut
                                ? "border-foreground/10 opacity-50 cursor-not-allowed"
                                : "border-foreground/20 hover:border-foreground/50"
                          }`}
                        >
                          <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em]">
                            <Package className="h-3.5 w-3.5 opacity-50" />
                            {seedCountFor(v)} {pt("seeds")}
                          </span>
                          <span className="text-right">
                            {(() => {
                              const vp = getVariantPrices(v);
                              return (
                                <PriceDisplay
                                  usdCents={vp.displayCents}
                                  originalUsdCents={vp.originalCents}
                                  size="sm"
                                />
                              );
                            })()}
                          </span>
                        </button>
                      );
                      })}
                    </div>
                </div>
              )}

              {selectedVariant && selectedPrices && (
                <div className="mb-6">
                  <PriceDisplay usdCents={selectedPrices.displayCents} originalUsdCents={selectedPrices.originalCents} size="xl" />
                </div>
              )}

              {/* Shipping */}
              {product.shipping_cents > 0 && (
                <div className="mb-6 border border-foreground/25 bg-muted/50 px-4 py-3 flex items-start gap-3">
                  <Truck className="h-4 w-4 text-foreground/80 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <div>
                      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-foreground/90">{pt("shippingFixed")}: </span>
                      <PriceDisplay usdCents={product.shipping_cents} size="sm" />
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-foreground/70">{pt("shippingWorldwide")}</span>
                  </div>
                </div>
              )}

              {/* Quantity + Add to Cart */}
              <div className="mb-6 flex gap-2" ref={addToCartButtonRef}>
                {/* Quantity stepper */}
                <div className="flex shrink-0 items-center border border-foreground/20">
                  <button
                    aria-label="Diminuir quantidade"
                    disabled={outOfStock || quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-11 w-10 items-center justify-center text-foreground/60 transition-colors hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="flex h-11 w-10 items-center justify-center border-x border-foreground/20 font-mono text-[13px] font-bold tabular-nums">
                    {quantity}
                  </span>
                  <button
                    aria-label="Aumentar quantidade"
                    disabled={outOfStock}
                    onClick={() => setQuantity((q) => q + 1)}
                    className="flex h-11 w-10 items-center justify-center text-foreground/60 transition-colors hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Add to cart button */}
                <Button
                  size="lg"
                  className="flex-1 gap-2 rounded-none font-mono text-[11px] font-bold uppercase tracking-[0.15em]"
                  disabled={outOfStock || !selectedVariant}
                  onClick={() => {
                    if (!selectedVariant || !selectedPrices) return;
                    addItem({
                      variantId: selectedVariant.id,
                      productId: product.id,
                      slug: product.slug,
                      name: translation.name,
                      variantLabel: `${seedCountFor(selectedVariant)} ${pt("seeds")}`,
                      priceCents: selectedPrices.displayCents,
                      originalPriceCents: selectedPrices.originalCents,
                      shippingCents: product.shipping_cents,
                      image: product.images.find((img) => !/\.(mp4|webm|mov)($|\?)/i.test(img)) ?? product.images[0] ?? "",
                      video: product.images.find((img) => /\.(mp4|webm|mov)($|\?)/i.test(img)),
                    }, quantity);
                    showConfirmation({
                      name: translation.name,
                      variantLabel: `${seedCountFor(selectedVariant)} ${pt("seeds")}`,
                      priceCents: selectedPrices.displayCents,
                      originalPriceCents: selectedPrices.originalCents,
                      image: product.images.find((img) => !/\.(mp4|webm|mov)($|\?)/i.test(img)) ?? product.images[0] ?? "",
                    });
                    setQuantity(1);
                  }}
                >
                  {outOfStock ? (
                    pt("outOfStock")
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4" />
                      {t("addToCart")}
                    </>
                  )}
                </Button>
              </div>

              {/* Description */}
              <div>
                <h2 className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/50">
                  {pt("description")}
                </h2>
                <p className="font-sans text-base leading-relaxed text-muted-foreground">
                  {translation.description}
                </p>
              </div>

              {/* Flavor Profile */}
              {product.flavors && product.flavors.length > 0 && (
                <div className="mt-5">
                  <FlavorProfile
                    flavors={product.flavors}
                    label={pt("flavorProfile")}
                  />
                </div>
              )}
            </div>
          </FadeUp>
        </div>

        {/* Full-width detail sections */}
        <FadeUp delay={0.3}>
          <div className="mt-12 space-y-8">

            {/* ── Bundle Components Section ── */}
            {isBundle && product.bundle_components && product.bundle_components.length > 0 && (
              <div className="relative p-3 md:p-4">
                <CropMarks />
                <div className="relative border-t-[3px] border-b-[3px] border-foreground border-x border-x-foreground/40 bg-card overflow-hidden">
                  <DotPattern width={12} height={12} cr={0.5} className="text-foreground opacity-[0.025]" />
                  <div className="relative border-b border-foreground/20 px-5 py-2 md:px-6">
                    <div className="flex items-center gap-3">
                      <Package className="h-3.5 w-3.5 text-foreground/50" />
                      <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-foreground/80">
                        {pt("bundleContents")}
                      </span>
                    </div>
                    <RuledDivider variant="ornamental" className="mt-2" />
                  </div>
                  <div className="divide-y divide-foreground/10 px-5 md:px-6">
                    {product.bundle_components.map((comp) => {
                      const name =
                        comp.products?.product_translations?.[0]?.name ??
                        comp.component_product_id;
                      return (
                        <div
                          key={comp.component_product_id}
                          className="flex items-center justify-between py-3"
                        >
                          <span className="font-mono text-[11px] uppercase tracking-[0.1em]">
                            {name}
                          </span>
                          <span className="flex items-center gap-1.5 border border-foreground/20 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em]">
                            <Package className="h-3 w-3 text-foreground/50" />
                            {comp.seed_count} {pt("seeds")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Strain Science: rich card or plain table ──
               * Toggled by superadmin in /admin/configuracoes. The plain
               * table renders the same data without illustrations. */}
            {!isBundle && (product.seed_type || product.genetics || product.flowering_weeks_min || product.thc_min !== null || product.seed_banks || product.parent_mother || product.parent_father || product.product_terpenes?.length) && !strainScienceCardEnabled && (
              <div className="relative p-3 md:p-4">
                <StrainScienceTable
                  productName={translation.name}
                  seedBank={
                    product.seed_banks?.seed_bank_translations[0]
                      ? {
                          name: product.seed_banks.seed_bank_translations[0].name,
                          website: product.seed_banks.website || undefined,
                        }
                      : null
                  }
                  seedType={product.seed_type}
                  seedTypeLabel={
                    product.seed_type ? pt(`seedTypes.${product.seed_type}`) : ""
                  }
                  floweringMin={product.flowering_weeks_min}
                  floweringMax={product.flowering_weeks_max}
                  thcMin={product.thc_min}
                  thcMax={product.thc_max}
                  cbdMin={product.cbd_min}
                  cbdMax={product.cbd_max}
                  genetics={product.genetics}
                  parentMother={product.parent_mother}
                  parentFather={product.parent_father}
                  terpenes={product.product_terpenes ?? []}
                />
              </div>
            )}

            {/* ── Industrial Strain Card (hidden for bundles) ── */}
            {!isBundle && (product.seed_type || product.genetics || product.flowering_weeks_min || product.thc_min !== null || product.seed_banks || product.parent_mother || product.parent_father || product.product_terpenes?.length) && strainScienceCardEnabled && (
              <div className="relative p-3 md:p-4">
                {/* Crop marks */}
                <CropMarks />

                {/* Main card with sharp industrial frame */}
                <div className="relative border-t-[3px] border-b-[3px] border-foreground border-x border-x-foreground/40 bg-card overflow-hidden">
                  {/* Dot-grid texture overlay */}
                  <DotPattern width={12} height={12} cr={0.5} className="text-foreground opacity-[0.025]" />

                  {/* ─── Header Bar ─── */}
                  <div className="relative border-b border-foreground/20 px-5 py-2 md:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FlaskConical className="h-3.5 w-3.5 text-foreground/50" />
                        <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-foreground/80">
                          {pt("strainScience")}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="hidden sm:block text-[9px] font-mono uppercase tracking-[0.15em] text-foreground/30">
                          {translation.name}
                        </span>
                        <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-foreground/40">
                          No.{" "}
                          {formatProductSpecimenNo({
                            ...product,
                            productName: translation.name,
                          })}
                        </span>
                      </div>
                    </div>
                    <RuledDivider variant="ornamental" className="mt-2" />
                  </div>

                  {/* ─── Stats Row (compartmentalized) ─── */}
                  {(product.seed_type || product.flowering_weeks_min || product.thc_min !== null || product.seed_banks) && (
                    <div className="border-b border-foreground/15">
                      <StrainInfo
                        seedBank={
                          product.seed_banks?.seed_bank_translations[0]
                            ? {
                                name: product.seed_banks.seed_bank_translations[0].name,
                                website: product.seed_banks.website || undefined,
                              }
                            : null
                        }
                        seedType={product.seed_type}
                        seedTypeLabel={product.seed_type ? pt(`seedTypes.${product.seed_type}`) : ""}
                        floweringMin={product.flowering_weeks_min}
                        floweringMax={product.flowering_weeks_max}
                        thcMax={product.thc_max}
                        cbdMax={product.cbd_max}
                        labels={{
                          seedBank: pt("seedBank"),
                          seedType: pt("seedType"),
                          floweringTime: pt("floweringTime"),
                          weeks: pt("weeks"),
                        }}
                      />
                    </div>
                  )}

                  {/* ─── Strain Science + Terpene Profile ─── */}
                  {(product.seed_type || product.parent_mother || product.parent_father || product.product_terpenes?.length) && (
                    <div className="flex flex-col">
                      <div className="flex flex-col md:flex-row md:items-stretch">
                        {/* Left: Image or Video */}
                        {product.images.length > 0 && (
                          <div className="relative border-b border-foreground/15 md:w-[40%] lg:w-[35%] md:border-b-0 md:border-r">
                            <div className="relative aspect-[4/5] w-full overflow-hidden bg-foreground/5">
                              {/\.(mp4|webm|mov)($|\?)/i.test(product.images[0]!) && !strainVideoError ? (
                                <LazyVideo
                                  src={product.images[0]!}
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                  preload="none"
                                  onError={() => setStrainVideoError(true)}
                                  className="absolute inset-0 h-full w-full"
                                />
                              ) : (
                                <Image
                                  src={
                                    (/\.(mp4|webm|mov)($|\?)/i.test(product.images[0]!)
                                      ? product.images.find((u) => !/\.(mp4|webm|mov)($|\?)/i.test(u))
                                      : product.images[0]) ?? product.images[0]!
                                  }
                                  alt={translation.name}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 768px) 100vw, 40vw"
                                />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Right: Monogram + Genetics row, Description below */}
                        <div className={product.images.length > 0 ? "flex min-w-0 flex-1" : "flex min-w-0 w-full"}>
                          <div className="flex min-w-0 flex-1 flex-col">
                            {/* Monogram + Genetics side by side at lg */}
                            <div className="flex flex-col border-b border-foreground/15 lg:flex-row lg:items-stretch">
                              {/* Monogram */}
                              <div className="relative flex flex-col border-b border-foreground/15 p-4 md:p-5 lg:w-1/2 lg:border-b-0 lg:border-r lg:p-4">
                                <p className="mb-3 text-[10px] font-mono font-semibold uppercase tracking-[0.25em] text-foreground/50">
                                  <FlaskConical className="mr-1 -mt-0.5 inline h-3 w-3" />
                                  {pt("strainInfo")}
                                </p>
                                <StrainMonogram
                                  name={translation.name}
                                  seedType={product.seed_type}
                                  thcMax={product.thc_max}
                                  cbdMax={product.cbd_max}
                                  dominantTerpene={dominantTerpene}
                                  specimenNo={formatProductSpecimenNo({
                                    ...product,
                                    productName: translation.name,
                                  })}
                                />
                              </div>

                              {/* Genetics */}
                              {(product.parent_mother ||
                                product.parent_father ||
                                product.genetics) && (
                                <div className="relative flex w-full min-w-0 flex-col items-center justify-center px-3 py-4 sm:px-4 md:px-5 lg:w-1/2 lg:p-4">
                                  <p className="mb-2 text-center text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/40">
                                    {pt("genetics")}
                                  </p>
                                  <div className="flex w-full justify-center overflow-hidden">
                                    <GeneticsTree
                                      genetics={product.genetics}
                                      parentMother={product.parent_mother}
                                      parentFather={product.parent_father}
                                      childName={translation.name}
                                      motherLabel={pt("parentMother")}
                                      fatherLabel={pt("parentFather")}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                          </div>

                          {/* Barcode strip */}
                          <div className="relative hidden overflow-hidden border-l border-foreground/15 lg:block lg:w-12 xl:w-14">
                            <SpecimenBarcode className="absolute left-1/2 top-1/2 w-64 xl:w-80 2xl:w-96 aspect-[15/1] max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-90 text-foreground opacity-[0.07]" />
                          </div>
                        </div>

                        {/* Terpenes — inline column at lg+ */}
                        {product.product_terpenes && product.product_terpenes.length > 0 && (
                          <div className="hidden border-l border-foreground/15 bg-foreground/5 p-4 lg:block lg:w-[220px] xl:w-[240px]">
                            <TerpeneProfile entries={product.product_terpenes} compact />
                          </div>
                        )}
                      </div>

                      {/* Terpenes — full-width row below lg */}
                      {product.product_terpenes && product.product_terpenes.length > 0 && (
                        <div className="relative border-t border-foreground/15 bg-foreground/5 p-4 md:p-5 lg:hidden">
                          <TerpeneProfile entries={product.product_terpenes} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── Footer Bar ─── */}
                  <div className="relative border-t border-foreground/20 px-5 py-2 md:px-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono font-semibold uppercase tracking-[0.25em] text-foreground/30">
                        Sementes de Colecao
                      </span>
                      <div className="flex items-center gap-2">
                        <RuledDivider variant="ornamental" className="w-12 hidden sm:flex" />
                      </div>
                      <div className="flex gap-4">
                        {product.seed_type && (
                          <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-foreground/30">
                            {product.seed_type}
                          </span>
                        )}
                        {product.thc_max !== null && (
                          <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-foreground/30">
                            THC {product.thc_max}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Real Photos */}
            {product.show_real_photos && product.real_photos.length > 0 && (
              <RealPhotos
                photos={product.real_photos}
                title={pt("realPhotos")}
              />
            )}
          </div>
        </FadeUp>
      </div>
    </section>
    </>
  );
}
