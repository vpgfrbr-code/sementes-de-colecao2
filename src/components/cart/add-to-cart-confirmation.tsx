"use client";

import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PriceDisplay } from "@/components/price-display";
import { SafeImage } from "@/components/safe-image";
import { useCartConfirmationStore } from "@/store/cart-confirmation";

export function AddToCartConfirmation() {
  const { isOpen, item, hide } = useCartConfirmationStore();
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && hide()}>
      <DialogContent className="max-w-sm sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CircleCheck className="h-5 w-5 text-primary" />
            <DialogTitle className="font-display text-lg font-bold uppercase tracking-[0.1em]">
              {t("itemAddedToCart")}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            {t("itemAddedToCart")}
          </DialogDescription>
        </DialogHeader>

        {item && (
          <div className="flex items-center gap-4 border border-foreground/10 p-3">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-secondary">
              <SafeImage
                src={item.image}
                alt={item.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-sans text-sm font-medium leading-tight truncate">
                {item.name}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/60">
                {item.variantLabel}
              </span>
              <PriceDisplay
                usdCents={item.priceCents}
                originalUsdCents={item.originalPriceCents}
                size="sm"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full rounded-full font-mono text-[11px] font-bold uppercase tracking-[0.15em]"
            onClick={() => {
              hide();
              router.push(`/${locale}/checkout`);
            }}
          >
            {t("goToCheckout")}
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-full font-mono text-[11px] font-bold uppercase tracking-[0.15em]"
            onClick={hide}
          >
            {t("continueShopping")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
