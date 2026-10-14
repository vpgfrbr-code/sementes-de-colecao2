"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Ticket, Scissors } from "lucide-react";
import { toast } from "sonner";
import { CropMarks } from "@/components/product/crop-marks";
import { RuledDivider } from "@/components/product/ruled-divider";
import { SealStamp } from "@/components/product/seal-stamp";
import { DotPattern } from "@/components/ui/dot-pattern";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { claimAffiliateCoupon } from "@/lib/affiliate-cookie";

export function ExitIntentModal({
  code,
  percent,
}: {
  code: string;
  percent: number;
}) {
  const t = useTranslations("exitIntent");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const claimingRef = useRef(false);

  // Only run this component on product pages
  const isProductPage = pathname.includes("/produto/");

  const handleOpenModal = useCallback(() => {
    const hasSeenModal = localStorage.getItem("has_seen_exit_modal");
    if (!hasSeenModal) {
      setIsOpen(true);
      localStorage.setItem("has_seen_exit_modal", "true");
    }
  }, []);

  useEffect(() => {
    if (!isProductPage) return;

    // 1. Mouse leave event (top of the screen)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        handleOpenModal();
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);

    // 2. Fallback timer (30 seconds) for mobile/inactive users
    const timer = setTimeout(() => {
      handleOpenModal();
    }, 30000);

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      clearTimeout(timer);
    };
  }, [handleOpenModal, isProductPage]);

  const claimOffer = useCallback(async () => {
    if (claimingRef.current) return;
    claimingRef.current = true;
    const couponCode = code.trim().toUpperCase();
    if (!couponCode) {
      claimingRef.current = false;
      return;
    }

    void navigator.clipboard.writeText(couponCode).catch(() => {});

    await claimAffiliateCoupon(couponCode);

    toast.success(t("claimSuccess"));
    setIsOpen(false);
    router.push(`/${locale}/checkout?ref=${encodeURIComponent(couponCode)}`);
  }, [t, locale, router, code]);

  const handleContentClick = (e: React.MouseEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest('[data-slot="dialog-close"]')) return;
    if (el.closest("[data-exit-dismiss]")) return;
    if (el.closest("[data-exit-primary]")) return;
    claimOffer();
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isProductPage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="sm:max-w-md rounded-none border-none bg-transparent p-0 shadow-none cursor-pointer gap-0"
        onClick={handleContentClick}
      >
        {/* Outer wrapper with padding for crop marks */}
        <div className="relative p-4 md:p-5">
          <CropMarks />

          {/* Inner card */}
          <div className="relative border-t-[3px] border-b-[3px] border-foreground border-x border-x-foreground/40 bg-card overflow-hidden shadow-2xl">
            {/* Dot-grid texture */}
            <DotPattern width={12} height={12} cr={0.5} className="text-foreground opacity-[0.025]" />

            {/* Accessibility header */}
            <DialogHeader className="sr-only">
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>{t("subtitle", { percent })}</DialogDescription>
            </DialogHeader>

            {/* Image section */}
            <div className="relative h-[160px] w-full bg-secondary">
              <Image
                src="/images/seed.png"
                alt=""
                fill
                className="object-contain p-6"
                sizes="(max-width: 640px) 100vw, 448px"
              />
            </div>

            {/* Header bar */}
            <div className="relative border-t border-foreground/20 px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <TypingAnimation
                    as="span"
                    startOnView
                    showCursor={false}
                    typeSpeed={40}
                    className="font-display text-sm font-bold uppercase tracking-[0.2em]"
                  >
                    {t("header")}
                  </TypingAnimation>
                  <RuledDivider variant="ornamental" className="mt-2" />
                </div>
                <SealStamp
                  topText={`${percent}% OFF`}
                  bottomText={t("subtitle", { percent })}
                  centerContent={
                    <Scissors className="h-3.5 w-3.5 text-foreground/60" />
                  }
                  size={56}
                  rotation={-12}
                  className="ml-3 -mr-1"
                />
              </div>
            </div>

            {/* Description */}
            <div className="relative px-5 py-3">
              <p className="font-sans text-sm text-foreground/70">
                {t("description")}
              </p>
            </div>

            {/* Coupon code compartment */}
            <div className="relative border-t border-foreground/10 px-5 py-4 text-center">
              <span className="block text-[9px] font-mono uppercase tracking-[0.25em] text-foreground/70">
                {t("codeLabel")}
              </span>
              <div className="mt-2 flex items-center justify-center gap-2.5">
                <Ticket className="h-4 w-4 text-foreground/70" />
                <span className="text-lg font-mono font-bold uppercase tracking-[0.2em]">
                  {code}
                </span>
              </div>
              <span
                className="mt-2.5 inline-block text-[8px] font-mono font-bold uppercase tracking-[0.15em] border px-1.5 py-0.5 -rotate-2 text-accent border-accent/60"
              >
                {t("stampLabel")}
              </span>
            </div>

            {/* CTA section */}
            <div className="relative px-5 pt-1 pb-4">
              <RuledDivider variant="dashed" className="mb-4" />
              <Button
                type="button"
                size="lg"
                className="w-full rounded-full font-mono uppercase tracking-wider h-12 shadow-md"
                data-exit-primary
                onClick={(e) => {
                  e.stopPropagation();
                  claimOffer();
                }}
              >
                {t("cta")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="mt-2 w-full font-mono text-xs uppercase tracking-wider text-foreground/70 hover:text-foreground"
                data-exit-dismiss
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
              >
                {t("noThanks")}
              </Button>
            </div>

            {/* Footer bar */}
            <div className="relative border-t border-foreground/20 px-5 py-2.5">
              <span className="text-[8px] font-mono font-semibold uppercase tracking-[0.25em] text-foreground/30">
                SEMENTES DE COLECAO
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
