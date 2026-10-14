"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Ticket, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DotPattern } from "@/components/ui/dot-pattern";
import { claimAffiliateCoupon } from "@/lib/affiliate-cookie";

const SESSION_KEY = "welcome_coupon_dismissed";
const STORAGE_KEY = "welcome_coupon_used";

export function WelcomeCouponStrip({
  code,
  percent,
}: {
  code: string;
  percent: number;
}) {
  const t = useTranslations("welcomeCoupon");
  const locale = useLocale();
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const [visible, setVisible] = useState(false);
  const claimingRef = useRef(false);

  // Never show on admin pages
  const isAdmin = pathname.includes("/admin");

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) return;
    if (isAdmin) return;

    // Dismissed for this session
    if (sessionStorage.getItem(SESSION_KEY)) return;
    // Already claimed (localStorage persists across sessions)
    if (localStorage.getItem(STORAGE_KEY)) return;

    setVisible(true);
  }, [isLoaded, isSignedIn, isAdmin]);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "true");
    setVisible(false);
  };

  const claim = async () => {
    if (claimingRef.current) return;
    claimingRef.current = true;

    const couponCode = code.trim().toUpperCase();
    void navigator.clipboard.writeText(couponCode).catch(() => {});

    await claimAffiliateCoupon(couponCode);

    localStorage.setItem(STORAGE_KEY, "true");
    toast.success(t("claimSuccess"));
    setVisible(false);

    claimingRef.current = false;
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40">
      <div className="relative border-t-[3px] border-background/20 bg-foreground text-background overflow-hidden">
        {/* Subtle dot-grid texture */}
        <DotPattern
          width={12}
          height={12}
          cr={0.5}
          className="text-background opacity-[0.05]"
        />

        {/* Mobile: two-row layout. Desktop: single row. */}
        <div className="relative mx-auto max-w-screen-xl px-4 py-3 md:px-6">
          {/* Row 1 (mobile) / full row (desktop) */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Icon + code */}
            <Ticket className="h-4 w-4 shrink-0 text-background/60" />
            <span className="font-mono text-sm font-bold uppercase tracking-[0.18em]">
              {code}
            </span>

            {/* Divider — desktop only */}
            <span className="hidden h-4 w-px bg-background/20 md:block" />

            {/* Description */}
            <span className="flex-1 font-mono text-[11px] uppercase tracking-[0.12em] text-background/60">
              {t("discount", { percent })}
            </span>

            {/* CTA — desktop only inline */}
            <Button
              type="button"
              size="sm"
              className="hidden md:inline-flex rounded-full font-mono text-xs uppercase tracking-wider shrink-0 bg-background text-foreground hover:bg-background/90"
              onClick={claim}
            >
              {t("cta")}
            </Button>

            {/* Dismiss — always visible, large tap target on mobile */}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dispensar"
              className="shrink-0 -mr-1 flex h-10 w-10 items-center justify-center text-background/40 hover:text-background transition-colors md:h-8 md:w-8"
            >
              <X className="h-5 w-5 md:h-4 md:w-4" />
            </button>
          </div>

          {/* Row 2 — CTA on mobile only */}
          <div className="mt-2 md:hidden">
            <Button
              type="button"
              size="sm"
              className="w-full rounded-full font-mono text-xs uppercase tracking-wider bg-background text-foreground hover:bg-background/90"
              onClick={claim}
            >
              {t("cta")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
