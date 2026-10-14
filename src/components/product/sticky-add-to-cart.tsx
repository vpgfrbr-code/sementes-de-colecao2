"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriceDisplay } from "@/components/price-display";

interface StickyAddToCartProps {
  /** The ref pointing to the main Add-to-Cart button on the page */
  anchorRef: React.RefObject<HTMLElement | null>;
  productName: string;
  variantLabel: string | null;
  priceCents: number | null;
  originalPriceCents?: number;
  outOfStock: boolean;
  addToCartLabel: string;
  outOfStockLabel: string;
  onAddToCart: () => void;
}

/**
 * A thin sticky bar that slides up from the bottom on mobile ONLY when the
 * main Add-to-Cart button scrolls out of view. Sits above the MobileBottomNav
 * (bottom-16 = 64px) so it never overlaps navigation.
 */
export function StickyAddToCart({
  anchorRef,
  productName,
  variantLabel,
  priceCents,
  originalPriceCents,
  outOfStock,
  addToCartLabel,
  outOfStockLabel,
  onAddToCart,
}: StickyAddToCartProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky bar when the main button is NOT visible
        setVisible(!entry!.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(anchor);
    return () => observer.disconnect();
  }, [anchorRef]);

  return (
    <div
      className={`fixed inset-x-0 bottom-16 z-40 md:hidden transition-transform duration-300 ease-in-out ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <div className="border-t border-foreground/15 bg-background/95 backdrop-blur-sm px-4 py-3 flex items-center gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        {/* Product info */}
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold uppercase tracking-tight leading-tight truncate">
            {productName}
          </p>
          {variantLabel && (
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-foreground/50 truncate">
              {variantLabel}
            </p>
          )}
        </div>

        {/* Price */}
        {priceCents && (
          <div className="shrink-0">
            <PriceDisplay
              usdCents={priceCents}
              originalUsdCents={originalPriceCents}
              size="sm"
            />
          </div>
        )}

        {/* CTA */}
        <Button
          size="sm"
          className="shrink-0 gap-1.5 rounded-none font-mono text-[11px] font-bold uppercase tracking-[0.1em]"
          disabled={outOfStock || !priceCents}
          onClick={onAddToCart}
        >
          {outOfStock ? (
            outOfStockLabel
          ) : (
            <>
              <ShoppingBag className="h-3.5 w-3.5" />
              {addToCartLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
