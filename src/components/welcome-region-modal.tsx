"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserPreferences, type SupportedLanguage } from "@/lib/user-preferences";
import { routing } from "@/i18n/routing";

// Curated list of countries offered for shipping. Brazil first (home market),
// then other common destinations. Names resolved via `Intl.DisplayNames`.
const COUNTRY_CODES = [
  "BR",
  "US",
  "CA",
  "MX",
  "AR",
  "CL",
  "CO",
  "PE",
  "UY",
  "PY",
  "GB",
  "IE",
  "ES",
  "PT",
  "FR",
  "DE",
  "IT",
  "NL",
  "BE",
  "CH",
  "AT",
  "SE",
  "NO",
  "DK",
  "FI",
  "PL",
  "CZ",
  "GR",
  "AU",
  "NZ",
  "JP",
  "KR",
  "SG",
  "HK",
  "TH",
  "ZA",
  "IL",
  "AE",
] as const;

function detectLanguageFromNavigator(): SupportedLanguage {
  if (typeof navigator === "undefined") return "pt";
  const tag = navigator.language?.toLowerCase() ?? "";
  if (tag.startsWith("pt")) return "pt";
  if (tag.startsWith("es")) return "es";
  return "en";
}

function detectCountryFromNavigator(): string {
  if (typeof navigator === "undefined") return "BR";
  const tag = navigator.language ?? "";
  const parts = tag.split("-");
  if (parts.length >= 2 && /^[A-Z]{2}$/i.test(parts[1]!)) {
    return parts[1]!.toUpperCase();
  }
  // Fallback heuristic by language
  if (tag.toLowerCase().startsWith("pt")) return "BR";
  if (tag.toLowerCase().startsWith("es")) return "ES";
  return "US";
}

export function WelcomeRegionModal() {
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("welcomeRegion");
  const {
    hydrated,
    country,
    language,
    setPreferences,
    suggestedCountry,
    regionModalRequestId,
  } = useUserPreferences();

  const [open, setOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>("BR");
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(locale);
  const [ageVerified, setAgeVerified] = useState(false);

  // Track age-gate status. The `WelcomeRegionModal` uses a Radix `Dialog` which
  // installs a dismissable layer that can intercept the first pointer/touch
  // event aimed at the `AgeGate` button on mobile. Keep this modal closed
  // until the age gate has been cleared to avoid that tap conflict.
  useEffect(() => {
    const read = () => {
      try {
        setAgeVerified(localStorage.getItem("age_verified") === "true");
      } catch {
        setAgeVerified(false);
      }
    };
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "age_verified") read();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("age-verified", read);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("age-verified", read);
    };
  }, []);

  // Open automatically after hydration when user has no saved country preference.
  useEffect(() => {
    if (!hydrated) return;
    if (country) return;
    if (!ageVerified) return;
    const initialCountry =
      suggestedCountry && /^[A-Z]{2}$/.test(suggestedCountry.toUpperCase())
        ? suggestedCountry.toUpperCase()
        : detectCountryFromNavigator();
    const initialLanguage = detectLanguageFromNavigator();
    setSelectedCountry(
      COUNTRY_CODES.includes(initialCountry as (typeof COUNTRY_CODES)[number])
        ? initialCountry
        : "BR",
    );
    setSelectedLanguage(initialLanguage);
    setOpen(true);
  }, [hydrated, country, suggestedCountry, ageVerified]);

  // Explicit open request (e.g. from header button) — pre-fill with current prefs.
  useEffect(() => {
    if (regionModalRequestId === 0) return;
    setSelectedCountry(country ?? "BR");
    setSelectedLanguage(language ?? locale);
    setOpen(true);
  }, [regionModalRequestId, country, language, locale]);

  // Localized country names using Intl.DisplayNames (no manual i18n list).
  const countries = useMemo(() => {
    let displayNames: Intl.DisplayNames | null = null;
    try {
      displayNames = new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      displayNames = null;
    }
    const list = COUNTRY_CODES.map((code) => ({
      code,
      name: displayNames?.of(code) ?? code,
    }));
    // Keep Brazil at top, then sort the rest alphabetically by localized name.
    const [brazil, ...rest] = list;
    rest.sort((a, b) => a.name.localeCompare(b.name, locale));
    return [brazil!, ...rest];
  }, [locale]);

  const languageOptions: { value: SupportedLanguage; label: string }[] = [
    { value: "pt", label: t("languages.pt") },
    { value: "en", label: t("languages.en") },
    { value: "es", label: t("languages.es") },
  ];

  function handleConfirm() {
    setPreferences({
      country: selectedCountry,
      language: selectedLanguage,
    });
    setOpen(false);
  }

  function handleSkip() {
    // Skip = assume pt + BR. Still persists so modal doesn't re-open.
    setPreferences({ country: "BR", language: "pt" });
    setOpen(false);
  }

  // Guard against rendering before hydration/server.
  // When user has already chosen prefs, the modal is idle and only renders
  // on demand via `requestRegionModal` (tracked by the open state).
  if (!hydrated) return null;
  if (!country && !open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Before initial choice: only buttons can close. After initial choice,
        // allow closing via ESC/overlay (re-opened via header request).
        if (!country && !next) return;
        setOpen(next);
      }}
    >
      <DialogContent
        showCloseButton={Boolean(country)}
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => {
          if (!country) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (!country) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-[0.1em]">
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {t("countryLabel")}
            </label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {countries.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              {t("languageLabel")}
            </label>
            <Select
              value={selectedLanguage}
              onValueChange={(v) => setSelectedLanguage(v as SupportedLanguage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            {selectedCountry === "BR" ? t("currencyNoteBRL") : t("currencyNoteUSD")}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {!country && (
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="font-mono text-[11px] uppercase tracking-[0.1em]"
            >
              {t("skip")}
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            className="font-mono text-[11px] uppercase tracking-[0.1em]"
          >
            {t("confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Re-export a noop for server consumers to avoid accidental imports
export const _supportedLocales = routing.locales;
