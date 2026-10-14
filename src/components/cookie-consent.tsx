"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value};expires=${expires};path=/;SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)")
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function CookieConsent() {
  const t = useTranslations("cookies");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getCookie("cookie_consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function handleAcceptAll() {
    setCookie("cookie_consent", "all", 30);
    setVisible(false);
  }

  function handleEssentialOnly() {
    setCookie("cookie_consent", "essential", 30);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside
      role="alert"
      aria-label="Cookie consent banner"
      className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-foreground bg-background/95 backdrop-blur-sm animate-in slide-in-from-bottom duration-500"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-4 md:flex-row md:gap-6 md:px-6">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-foreground/80" />
          <p
            className="max-w-xl text-center font-sans text-sm text-foreground/80 md:text-left"
            id="cookie-consent-description"
          >
            {t("description")}
          </p>
        </div>
        <div
          className="flex w-full shrink-0 flex-col gap-2 md:w-auto md:flex-row"
          aria-describedby="cookie-consent-description"
        >
          <Button
            onClick={handleEssentialOnly}
            variant="outline"
            size="sm"
            className="w-full rounded-full font-mono text-[11px] uppercase tracking-[0.1em] md:w-auto"
            aria-label={t("essentialOnly")}
          >
            {t("essentialOnly")}
          </Button>
          <Button
            onClick={handleAcceptAll}
            size="sm"
            className="w-full rounded-full font-mono text-[11px] uppercase tracking-[0.1em] md:w-auto"
            aria-label={t("acceptAll")}
          >
            {t("acceptAll")}
          </Button>
        </div>
      </div>
    </aside>
  );
}
