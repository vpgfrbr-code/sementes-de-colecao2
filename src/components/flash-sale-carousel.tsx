"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AnimatedHeading } from "@/components/animated-heading";
import { RuledDivider } from "@/components/product/ruled-divider";
import { ProductCard } from "@/components/product/product-card";
import { FadeUp } from "@/components/motion";

type ProductCardProduct = {
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
  product_translations: { name: string; description: string }[];
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

interface FlashSaleCarouselProps {
  title?: string;
  products: ProductCardProduct[];
  viewAllHref?: string;
  viewAllLabel?: string;
}

export function FlashSaleCarousel({ title, products, viewAllHref, viewAllLabel }: FlashSaleCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    dragFree: true,
    containScroll: "trimSnaps",
    loop: false,
  });

  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const updateState = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
    const progress = emblaApi.scrollProgress();
    setScrollProgress(Math.max(0, Math.min(1, progress)));
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    updateState();
    emblaApi.on("scroll", updateState);
    emblaApi.on("reInit", updateState);
    emblaApi.on("select", updateState);
    return () => {
      emblaApi.off("scroll", updateState);
      emblaApi.off("reInit", updateState);
      emblaApi.off("select", updateState);
    };
  }, [emblaApi, updateState]);

  if (products.length === 0) return null;

  return (
    <section className="py-10 md:py-14">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Header */}
        <FadeUp>
          <div className="mb-3 flex items-center justify-between">
            {title && (
              <AnimatedHeading
                as="h2"
                animation="slideUp"
                by="word"
                className="font-display text-3xl font-bold tracking-tight md:text-4xl"
              >
                {title}
              </AnimatedHeading>
            )}
            <div className="flex items-center gap-2">
              {viewAllHref && (
                <Link href={viewAllHref} aria-label={viewAllLabel ?? "Ver mais"}>
                  {/* Mobile: arrow icon only */}
                  <span className="flex sm:hidden h-8 w-8 items-center justify-center rounded-none border border-foreground/20 hover:bg-foreground/5 transition-colors">
                    <ChevronRight className="h-4 w-4 text-foreground/60" />
                  </span>
                  {/* Desktop: full label button */}
                  <Button variant="outline" size="sm" className="hidden sm:inline-flex rounded-full font-mono text-[11px] uppercase tracking-[0.1em]">
                    {viewAllLabel ?? "Ver mais"}
                  </Button>
                </Link>
              )}
              {/* Nav arrows — hidden on mobile (touch drag suffices) */}
            <div className="hidden md:flex items-center gap-1.5">
              <button
                onClick={() => emblaApi?.scrollPrev()}
                disabled={!canPrev}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-none border border-foreground/20 transition-colors",
                  canPrev
                    ? "hover:bg-foreground/5 text-foreground"
                    : "text-foreground/20 cursor-not-allowed"
                )}
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => emblaApi?.scrollNext()}
                disabled={!canNext}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-none border border-foreground/20 transition-colors",
                  canNext
                    ? "hover:bg-foreground/5 text-foreground"
                    : "text-foreground/20 cursor-not-allowed"
                )}
                aria-label="Próximo"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              </div>
            </div>
          </div>
          <RuledDivider variant="ornamental" className="mb-6" />
        </FadeUp>

        {/* Carousel */}
        <div ref={emblaRef} className="overflow-hidden cursor-grab active:cursor-grabbing">
          <div className="flex gap-4 select-none">
            {products.map((product, i) => (
              <div
                key={product.id}
                className="min-w-0 shrink-0 basis-[78vw] sm:basis-[44vw] md:basis-[32vw] lg:basis-[23%] xl:basis-[22%]"
              >
                <ProductCard product={product} priority={i < 2} />
              </div>
            ))}
          </div>
        </div>

        {/* Scroll progress bar */}
        {(canPrev || canNext) && (
          <div className="mt-5 h-[2px] w-full bg-foreground/10">
            <div
              className="h-full bg-foreground/40 transition-all duration-150"
              style={{ width: `${scrollProgress * 100}%` }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
