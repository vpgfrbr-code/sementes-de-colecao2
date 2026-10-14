"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import { ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { calculateDiscountedPrice, isPromotionActive } from "@/lib/format-price";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";

interface ProductCardProps {
  featured?: boolean;
  /**
   * Preload the card's primary image (`priority` + `fetchPriority="high"`).
   * Set on the first ~4 cards above the fold so the browser doesn't defer
   * them via lazy-load.
   */
  priority?: boolean;
  product: {
    id: string;
    slug: string;
    images: string[];
    stock: number;
    seed_type?: string | null;
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
  };
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov)($|\?)/i.test(url);
}

export function ProductCard({ product, featured, priority = false }: ProductCardProps) {
  const locale = useLocale();
  const pt = useTranslations("product");
  const translation = product.product_translations[0];
  const variants = product.product_variants ?? [];
  const minPrice = variants.length
    ? Math.min(...variants.map((v) => v.price_cents))
    : 0;
  const outOfStock = product.stock <= 0;
  const mediaItems = product.images ?? [];
  const hasMultipleMedia = mediaItems.length > 1;

  // Sale logic
  const productOnSale = isPromotionActive(product.on_sale, product.sale_ends_at);
  let displayPrice = minPrice;
  let originalPrice: number | undefined;

  if (productOnSale && variants.length > 0) {
    if (product.variant_discounts_enabled) {
      const prices = variants.map((v) => {
        if (isPromotionActive(v.on_sale, v.sale_ends_at)) {
          return calculateDiscountedPrice(v.price_cents, v.discount_type as "percentage" | "fixed", v.discount_value);
        }
        return v.price_cents;
      });
      displayPrice = Math.min(...prices);
      if (displayPrice < minPrice) originalPrice = minPrice;
    } else {
      displayPrice = calculateDiscountedPrice(minPrice, product.discount_type as "percentage" | "fixed", product.discount_value);
      if (displayPrice < minPrice) originalPrice = minPrice;
    }
  }

  if (!translation) return null;

  const href = `/${locale}/produto/${product.slug}`;

  return (
    <HoverLift>
      <Card className="group overflow-hidden rounded-none border-t-[2px] border-t-foreground border-x border-b border-foreground/20 bg-card py-0 gap-0">
        <Link href={href} className="block">
          {hasMultipleMedia ? (
            <CardGallery
              mediaItems={mediaItems}
              alt={translation.name}
              outOfStock={outOfStock}
              outOfStockLabel={pt("outOfStock")}
              originalPrice={originalPrice}
              discountType={product.discount_type}
              discountValue={product.discount_value}
              featured={featured}
              featuredLabel={pt("featured")}
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
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
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
              {featured && !outOfStock && (
                <span className="absolute left-3 top-3 rotate-1 border border-primary/60 bg-primary px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-primary-foreground">
                  {pt("featured")}
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

        <CardContent className="space-y-2 border-t border-foreground/10 px-4 py-3">
          <Link href={href} className="block">
            <h3 className="font-display text-base font-bold uppercase leading-tight tracking-[0.05em] line-clamp-2">
              {translation.name}
            </h3>
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {displayPrice > 0 && (
              <PriceDisplay usdCents={displayPrice} originalUsdCents={originalPrice} size="sm" />
            )}
            {product.seed_type && (
              <span className="shrink-0 whitespace-nowrap border border-foreground/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/60">
                {pt(`seedTypes.${product.seed_type}`)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </HoverLift>
  );
}

function CardGallery({
  mediaItems,
  alt,
  outOfStock,
  outOfStockLabel,
  originalPrice,
  discountType,
  discountValue,
  featured,
  featuredLabel,
  priority = false,
}: {
  mediaItems: string[];
  alt: string;
  outOfStock: boolean;
  outOfStockLabel: string;
  originalPrice?: number;
  discountType?: string | null;
  discountValue?: number | null;
  featured?: boolean;
  featuredLabel?: string;
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
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
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
      {featured && !outOfStock && (
        <span className="absolute left-3 top-3 rotate-1 border border-primary/60 bg-primary px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-primary-foreground">
          {featuredLabel}
        </span>
      )}
      {originalPrice && !outOfStock && (
        <span className="absolute right-3 top-3 rotate-1 border border-red-500/50 bg-red-500 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-white">
          {discountType === "percentage" ? `-${discountValue}%` : "Promoção"}
        </span>
      )}
    </div>
  );
}
