"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Autoplay from "embla-carousel-autoplay";
import { Package, Plus, RefreshCw, ShoppingBag, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ImageWithSkeleton } from "@/components/ui/image-with-skeleton";
import { HoverLift } from "@/components/motion";
import { LazyVideo } from "@/components/lazy-video";
import { PriceDisplay } from "@/components/price-display";
import { FlavorProfile } from "@/components/product/flavor-profile";
import { calculateDiscountedPrice, isPromotionActive } from "@/lib/format-price";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart";
import { useCartConfirmationStore } from "@/store/cart-confirmation";
import { type ShopProduct, deriveCycleType, type CycleType } from "./shop-types";

function isVideo(url: string) {
  return /\.(mp4|webm|mov)($|\?)/i.test(url);
}

export function ShopProductCard({
  product,
  reviewAggregate,
  priority = false,
}: {
  product: ShopProduct;
  reviewAggregate?: { average: number; count: number };
  /**
   * Preload the card's primary image (`priority` + `fetchPriority="high"`).
   * Pass `true` for the first ~4 cards in the grid so above-the-fold images
   * are not deferred by the lazy-load IntersectionObserver.
   */
  priority?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("shop");
  const pt = useTranslations("product");
  const ct = useTranslations("common");
  const searchParams = useSearchParams();
  const addItem = useCartStore((s) => s.addItem);
  const showConfirmation = useCartConfirmationStore((s) => s.show);

  // Persist current filters so the product detail page can return to the filtered view.
  const persistFilters = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const qs = searchParams?.toString() ?? "";
      if (qs) window.sessionStorage.setItem("shopFiltersQS", qs);
      else window.sessionStorage.removeItem("shopFiltersQS");
    } catch {
      // ignore
    }
  }, [searchParams]);

  const translation = product.product_translations[0];
  const variants = product.product_variants ?? [];
  const minPrice = variants.length ? Math.min(...variants.map((v) => v.price_cents)) : 0;
  const totalStock = product.stock;
  const outOfStock = totalStock <= 0;
  const mediaItems = product.images ?? [];
  const hasMultipleMedia = mediaItems.length > 1;

  const cycleType = deriveCycleType(product);
  const cycleLabel: Record<CycleType, string> = {
    automatic: t("cycleAutomatic"),
    "fast-flowering": t("cycleFastFlowering"),
    photoperiod: t("cyclePhotoperiod"),
  };

  // Default variant display: smallest seed_count
  const defaultVariant = variants.length
    ? variants.reduce((a, b) => (a.seed_count < b.seed_count ? a : b))
    : null;

  // Sale price computation
  const productOnSale = isPromotionActive(product.on_sale, product.sale_ends_at);
  let displayPrice = minPrice;
  let originalPrice: number | undefined;
  if (minPrice > 0) {
    // Find cheapest effective price across variants
    const prices = variants.map((v) => {
      if (product.variant_discounts_enabled && isPromotionActive(v.on_sale, v.sale_ends_at) && v.discount_type && v.discount_value) {
        return calculateDiscountedPrice(v.price_cents, v.discount_type, v.discount_value);
      }
      if (productOnSale && product.discount_type && product.discount_value) {
        return calculateDiscountedPrice(v.price_cents, product.discount_type, product.discount_value);
      }
      return v.price_cents;
    });
    const cheapest = Math.min(...prices);
    if (cheapest < minPrice) {
      displayPrice = cheapest;
      originalPrice = minPrice;
    }
  }

  const categoryName =
    product.categories?.category_translations?.[0]?.name ?? null;

  const dominantTerpene =
    product.product_terpenes?.find((t) => t.is_dominant)?.terpenes ?? null;

  if (!translation) return null;

  const href = `/${locale}/produto/${product.slug}`;

  const quickAddToCart = (variant: typeof variants[number]) => {
    // Variant-level sale first, then product-level
    let priceCents = variant.price_cents;
    let originalPriceCents: number | undefined;
    if (
      product.variant_discounts_enabled &&
      isPromotionActive(variant.on_sale, variant.sale_ends_at) &&
      variant.discount_type &&
      variant.discount_value
    ) {
      const discounted = calculateDiscountedPrice(variant.price_cents, variant.discount_type, variant.discount_value);
      if (discounted < variant.price_cents) {
        priceCents = discounted;
        originalPriceCents = variant.price_cents;
      }
    } else if (productOnSale && product.discount_type && product.discount_value) {
      const discounted = calculateDiscountedPrice(variant.price_cents, product.discount_type, product.discount_value);
      if (discounted < variant.price_cents) {
        priceCents = discounted;
        originalPriceCents = variant.price_cents;
      }
    }

    const imageSrc =
      product.images.find((img) => !isVideo(img)) ?? product.images[0] ?? "";
    const videoSrc = product.images.find((img) => isVideo(img));
    const variantLabel = `${variant.seed_count} ${pt("seeds")}`;

    addItem({
      variantId: variant.id,
      productId: product.id,
      slug: product.slug,
      name: translation.name,
      variantLabel,
      priceCents,
      originalPriceCents,
      shippingCents: product.shipping_cents,
      image: imageSrc,
      video: videoSrc,
    });
    showConfirmation({
      name: translation.name,
      variantLabel,
      priceCents,
      originalPriceCents,
      image: imageSrc,
    });
  };

  return (
    <HoverLift>
      <Card className="group overflow-hidden rounded-none border-t-[2px] border-t-foreground border-x border-b border-foreground/20 bg-card py-0 gap-0">
        {/* ─── Image ─── */}
        <Link href={href} onClick={persistFilters} className="block">
          {hasMultipleMedia ? (
            <CardGallery
              mediaItems={mediaItems}
              alt={translation.name}
              outOfStock={outOfStock}
              outOfStockLabel={pt("outOfStock")}
              isBundle={product.product_type === "bundle"}
              priority={priority}
            />
          ) : (
            <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
              {mediaItems[0] ? (
                isVideo(mediaItems[0]) ? (
                  <LazyVideo
                    src={mediaItems[0]}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="none"
                    className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <ImageWithSkeleton
                    src={mediaItems[0]}
                    alt={translation.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    priority={priority}
                    fetchPriority={priority ? "high" : "auto"}
                  />
                )
              ) : (
                <div className="flex h-full items-center justify-center text-foreground/20">
                  <ShoppingBag className="h-12 w-12" />
                </div>
              )}
              {outOfStock && (
                <span className="absolute left-3 top-3 -rotate-2 border border-foreground/40 bg-background/80 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] backdrop-blur-sm">
                  {pt("outOfStock")}
                </span>
              )}
              {product.product_type === "bundle" && !outOfStock && (
                <span className="absolute left-3 top-3 rotate-1 border border-foreground/60 bg-foreground px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-background">
                  Bundle
                </span>
              )}
              {originalPrice && !outOfStock && (
                <span className="absolute right-3 top-3 rotate-1 border border-red-500/50 bg-red-500 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-white">
                  {product.discount_type === "percentage" ? `-${product.discount_value}%` : pt("onSale")}
                </span>
              )}
            </div>
          )}
        </Link>

        {/* ─── Info ─── */}
        <CardContent className="space-y-3 border-t border-foreground/10 px-4 py-4">
          {/* Name + Price */}
          <Link href={href} onClick={persistFilters} className="block">
            <h3 className="font-display text-base font-bold uppercase leading-tight tracking-[0.05em] line-clamp-2">
              {translation.name}
            </h3>
          </Link>
          {minPrice > 0 && <PriceDisplay usdCents={displayPrice} originalUsdCents={originalPrice} size="lg" />}

          {/* Review rating badge */}
          {reviewAggregate && reviewAggregate.count > 0 && (
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-foreground/60">
              <span className="flex items-center gap-0.5" aria-label={`${reviewAggregate.average.toFixed(1)} / 5`}>
                {[1, 2, 3, 4, 5].map((i) => {
                  const filled = reviewAggregate.average >= i - 0.25;
                  return (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${filled ? "fill-foreground text-foreground" : "text-foreground/30"}`}
                    />
                  );
                })}
              </span>
              <span className="font-bold text-foreground">{reviewAggregate.average.toFixed(1)}</span>
              <span>({reviewAggregate.count})</span>
            </div>
          )}

          {/* Pack + Cycle + Terpene info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.1em] text-foreground/50">
            {defaultVariant && (
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {t("packWith")}:
                <span className="font-bold text-foreground">
                  {defaultVariant.seed_count}
                </span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              {t("cycleType")}:
              <span className="font-bold text-foreground">
                {cycleLabel[cycleType]}
              </span>
            </span>
            {dominantTerpene && (
              <span className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: dominantTerpene.color }}
                />
                <span className="font-bold text-foreground">{dominantTerpene.name}</span>
              </span>
            )}
          </div>

          {/* Flavor Icons */}
          {product.flavors && product.flavors.length > 0 && (
            <FlavorProfile flavors={product.flavors} max={3} compact />
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {variants.length > 1 ? (
              <>
                <Link href={href} onClick={persistFilters}>
                  <Button
                    size="sm"
                    className="w-full rounded-none font-mono text-[11px] font-bold uppercase tracking-[0.1em]"
                    disabled={outOfStock}
                  >
                    {t("viewOptions")}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 rounded-none border-foreground/30 font-mono text-[11px] font-bold uppercase tracking-[0.1em]"
                  disabled={outOfStock || !defaultVariant}
                  onClick={() => {
                    if (!defaultVariant) return;
                    quickAddToCart(defaultVariant);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {ct("addToCart")} ({defaultVariant?.seed_count})
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="w-full gap-1.5 rounded-none font-mono text-[11px] font-bold uppercase tracking-[0.1em]"
                disabled={outOfStock || !defaultVariant}
                onClick={() => {
                  if (!defaultVariant) return;
                  quickAddToCart(defaultVariant);
                }}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                {ct("addToCart")}
              </Button>
            )}
          </div>

          {/* Category tags */}
          {categoryName && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="shrink-0 whitespace-nowrap border border-foreground/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/60">
                {categoryName}
              </span>
              {product.seed_type && (
                <span className="shrink-0 whitespace-nowrap border border-foreground/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/60">
                  {pt(`seedTypes.${product.seed_type}`)}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </HoverLift>
  );
}

/* ── Card Gallery (reused from product-card pattern) ── */
function CardGallery({
  mediaItems,
  alt,
  outOfStock,
  outOfStockLabel,
  isBundle,
  priority = false,
}: {
  mediaItems: string[];
  alt: string;
  outOfStock: boolean;
  outOfStockLabel: string;
  isBundle?: boolean;
  /** Preload only the first slide image when true. */
  priority?: boolean;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const autoplayRef = useRef(
    Autoplay({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  return (
    <div className="relative">
      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "center" }}
        plugins={[autoplayRef.current]}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {mediaItems.map((src, i) => (
            <CarouselItem key={i} className="pl-0">
              <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
                {isVideo(src) ? (
                  <LazyVideo
                    src={src}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="none"
                    className="h-full w-full"
                  />
                ) : (
                  <ImageWithSkeleton
                    src={src}
                    alt={`${alt} ${i + 1}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                    priority={priority && i === 0}
                    fetchPriority={priority && i === 0 ? "high" : "auto"}
                  />
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Dot indicators */}
      <div className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
        {mediaItems.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 w-1 transition-all duration-300",
              current === i ? "w-3 bg-primary-foreground" : "bg-primary-foreground/50"
            )}
          />
        ))}
      </div>

      {outOfStock && (
        <span className="absolute left-3 top-3 -rotate-2 border border-foreground/40 bg-background/80 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] backdrop-blur-sm">
          {outOfStockLabel}
        </span>
      )}
      {isBundle && !outOfStock && (
        <span className="absolute left-3 top-3 rotate-1 border border-foreground/60 bg-foreground px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-background">
          Bundle
        </span>
      )}
    </div>
  );
}
