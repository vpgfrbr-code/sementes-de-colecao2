"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Minus, Plus, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { SafeImage, normalizeImageSrc } from "@/components/safe-image";
import { LazyVideo } from "@/components/lazy-video";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart";
import { useHydration } from "@/hooks/use-hydration";
import { PriceDisplay } from "@/components/price-display";
import { useLocale, useTranslations } from "next-intl";

interface CartDrawerProps {
  /** Custom trigger element. When provided, replaces the default icon button. */
  trigger?: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Controlled open state setter. */
  onOpenChange?: (open: boolean) => void;
}

export function CartDrawer({ trigger, open, onOpenChange }: CartDrawerProps = {}) {
  const locale = useLocale();
  const t = useTranslations("common");
  const hydrated = useHydration();
  const items = useCartStore((s) => s.items);
  const totalItems = useCartStore((s) => s.totalItems);
  const totalCents = useCartStore((s) => s.totalCents);
  const totalShippingCents = useCartStore((s) => s.totalShippingCents);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const count = hydrated ? totalItems() : 0;
  const subtotal = hydrated ? totalCents() : 0;
  const shipping = hydrated ? totalShippingCents() : 0;
  const total = subtotal + shipping;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="relative rounded-none">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center border border-foreground bg-foreground font-mono text-[10px] text-background">
                {count}
              </span>
            )}
            <span className="sr-only">{t("cart")}</span>
          </Button>
        )}
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col p-0 sm:max-w-lg">
        <SheetHeader className="border-b-[2px] border-foreground px-4 py-4 md:px-6">
          <SheetTitle className="font-display text-sm font-bold uppercase tracking-[0.2em]">
            {t("cart")}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t("cart")}
          </SheetDescription>
        </SheetHeader>

        {!hydrated || items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-foreground/30 md:px-6">
            <ShoppingBag className="h-16 w-16" />
            <p className="font-mono text-[11px] uppercase tracking-[0.15em]">{t("emptyCart")}</p>
            <SheetClose asChild>
              <Button variant="outline" className="gap-2 rounded-none border-foreground/30 font-mono text-[11px] uppercase tracking-[0.1em]">
                {t("continueShopping")}
              </Button>
            </SheetClose>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6">
              <div className="divide-y divide-foreground/10">
                {items.map((item) => (
                  <div key={item.variantId} className="flex gap-4 py-4 first:pt-4 last:pb-4 md:py-6">
                    {/* Image / Video */}
                    <div className="relative size-24 shrink-0 overflow-hidden border border-foreground/10 bg-secondary">
                      {item.video ? (
                        <LazyVideo
                          src={normalizeImageSrc(item.video) ?? item.video}
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="none"
                          className="h-full w-full"
                        />
                      ) : (
                        <SafeImage
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between gap-2">
                        <div className="flex-1">
                          <SheetClose asChild>
                            <Link
                              href={`/${locale}/produto/${item.slug}`}
                              className="font-display text-sm font-bold uppercase leading-tight tracking-[0.05em] line-clamp-2 hover:opacity-70 transition-opacity"
                            >
                              {item.name}
                            </Link>
                          </SheetClose>
                          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/40">
                            {item.variantLabel}
                          </p>
                        </div>
                        <div className="ml-2 shrink-0">
                          <PriceDisplay usdCents={item.priceCents} originalUsdCents={item.originalPriceCents} size="sm" />
                        </div>
                      </div>

                      <div className="mt-auto flex items-end justify-between pt-3">
                        {/* Quantity controls */}
                        <div className="flex items-center">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-none border-foreground/20"
                            aria-label="Diminuir quantidade"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="flex h-9 w-10 items-center justify-center border-y border-foreground/20 font-mono text-[12px] font-bold">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-none border-foreground/20"
                            aria-label="Aumentar quantidade"
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Remove */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-foreground/70 hover:text-destructive"
                          aria-label="Remover item"
                          onClick={() => removeItem(item.variantId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t-[2px] border-foreground px-4 py-6 md:px-6">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/50">{t("subtotal")}</span>
                  <PriceDisplay usdCents={subtotal} size="sm" />
                </div>
                {shipping > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/50">{t("shipping")}</span>
                    <PriceDisplay usdCents={shipping} size="sm" />
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-foreground/20 pt-3">
                <span className="font-display text-sm font-bold uppercase tracking-[0.1em]">{t("total")}</span>
                <PriceDisplay usdCents={total} size="lg" />
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <SheetClose asChild>
                  <Link href={`/${locale}/checkout`} className="w-full">
                    <Button size="lg" className="w-full gap-2 rounded-none font-mono text-[11px] font-bold uppercase tracking-[0.15em]">
                      {t("checkout")}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </SheetClose>

                <SheetClose asChild>
                  <Button variant="ghost" className="w-full rounded-none font-mono text-[11px] uppercase tracking-[0.1em]">
                    {t("continueShopping")}
                  </Button>
                </SheetClose>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
