"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

export function AgeGate() {
  const t = useTranslations("ageGate");
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("age_verified");
      setVerified(stored === "true");
    } catch {
      setVerified(false);
    }
  }, []);

  function handleConfirm() {
    try {
      localStorage.setItem("age_verified", "true");
    } catch {
      // localStorage unavailable — still dismiss for this session
    }
    // Notify other overlays in the same tab (e.g. WelcomeRegionModal) that
    // the age gate has been cleared so they can open safely. The `storage`
    // event only fires cross-tab, so we dispatch a custom event for same-tab.
    try {
      window.dispatchEvent(new Event("age-verified"));
    } catch {
      // Ignore — non-critical signal.
    }
    setVerified(true);
  }

  function handleDeny() {
    window.location.href = "https://www.google.com";
  }

  // While loading localStorage, render the blur overlay without interactive content
  // to prevent flash of unblurred content
  if (verified === null) {
    return (
      <div
        className="fixed inset-0 z-[105] bg-background/97"
        aria-hidden="true"
      />
    );
  }

  if (verified) return null;

  return (
    <div
      className="fixed inset-0 z-[105] flex items-start justify-center overflow-y-auto py-4 sm:items-center bg-background/97"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      aria-describedby="age-gate-description"
    >
      <div className="mx-4 w-full max-w-md border-t-[3px] border-b-[3px] border-background/80 bg-foreground p-6 text-center text-background shadow-xl md:p-10">
        {/* Logo */}
        <div className="mx-auto mb-6 flex justify-center">
          <BrandLogo
            width={320}
            height={125}
            className="h-14 w-auto brightness-0 invert md:h-20"
            textClassName="text-2xl text-background md:text-3xl"
            priority
          />
        </div>

        {/* Title */}
        <h2
          id="age-gate-title"
          className="font-display text-2xl font-bold uppercase tracking-[0.1em]"
        >
          {t("question")}
        </h2>

        {/* Description */}
        <p
          id="age-gate-description"
          className="mt-3 font-sans text-sm leading-relaxed text-background/80"
        >
          {t("description")}
        </p>

        {/* Divider */}
        <div className="my-6 h-px bg-background/20" />

        {/* Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={handleConfirm}
            size="lg"
            className="rounded-full bg-background px-8 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-foreground hover:bg-background/90"
          >
            {t("confirmYes")}
          </Button>
          <Button
            onClick={handleDeny}
            variant="outline"
            size="lg"
            className="rounded-full border-background/60 !bg-background px-8 font-mono text-[11px] font-bold uppercase tracking-[0.15em] !text-foreground hover:!bg-background/90 hover:!text-foreground"
          >
            {t("confirmNo")}
          </Button>
        </div>

        {/* Warning footer */}
        <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.2em] text-background/75">
          {t("warning")}
        </p>
      </div>
    </div>
  );
}
