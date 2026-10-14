"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { routing } from "@/i18n/routing";

export type SupportedLanguage = (typeof routing.locales)[number];
export type Currency = "BRL" | "USD";

export interface UserPreferences {
  country: string | null; // ISO-2 uppercase
  language: SupportedLanguage | null;
}

interface UserPreferencesContextValue extends UserPreferences {
  hydrated: boolean;
  currency: Currency;
  setPreferences: (prefs: { country: string; language: SupportedLanguage }) => void;
  clearPreferences: () => void;
  /** Country code suggested by server (Vercel geo header) — pre-selection only. */
  suggestedCountry: string | null;
  /** Request the welcome/region modal to open (even if prefs are already set). */
  requestRegionModal: () => void;
  /** Internal flag for the modal to listen to. */
  regionModalRequestId: number;
}

const COOKIE_NAME = "user_prefs";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

const Context = createContext<UserPreferencesContextValue | null>(null);

function readCookie(): UserPreferences | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!raw) return null;
  try {
    const value = decodeURIComponent(raw.slice(COOKIE_NAME.length + 1));
    const parsed = JSON.parse(value) as Partial<UserPreferences>;
    const country =
      typeof parsed.country === "string" && /^[A-Z]{2}$/.test(parsed.country)
        ? parsed.country
        : null;
    const language =
      parsed.language && (routing.locales as readonly string[]).includes(parsed.language)
        ? (parsed.language as SupportedLanguage)
        : null;
    if (!country || !language) return null;
    return { country, language };
  } catch {
    return null;
  }
}

function writeCookie(prefs: UserPreferences) {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(prefs));
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function deleteCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function UserPreferencesProvider({
  children,
  currentLocale,
  suggestedCountry = null,
}: {
  children: ReactNode;
  currentLocale: SupportedLanguage;
  suggestedCountry?: string | null;
}) {
  const [prefs, setPrefs] = useState<UserPreferences>({
    country: null,
    language: null,
  });
  const [hydrated, setHydrated] = useState(false);
  const [regionModalRequestId, setRegionModalRequestId] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = readCookie();
    if (stored) setPrefs(stored);
    setHydrated(true);
  }, []);

  const setPreferences = useCallback(
    ({ country, language }: { country: string; language: SupportedLanguage }) => {
      const normalized = { country: country.toUpperCase(), language };
      writeCookie(normalized);
      setPrefs(normalized);

      if (language !== currentLocale && pathname) {
        // pathname here already includes the locale segment (e.g. "/pt/loja")
        const segments = pathname.split("/");
        const hasLocale =
          segments.length > 1 &&
          (routing.locales as readonly string[]).includes(segments[1] ?? "");
        if (hasLocale) {
          segments[1] = language;
        } else {
          segments.splice(1, 0, language);
        }
        const nextPath = segments.join("/") || `/${language}`;
        router.push(nextPath);
        router.refresh();
      }
    },
    [currentLocale, pathname, router],
  );

  const clearPreferences = useCallback(() => {
    deleteCookie();
    setPrefs({ country: null, language: null });
  }, []);

  const requestRegionModal = useCallback(() => {
    setRegionModalRequestId((n) => n + 1);
  }, []);

  const currency: Currency = prefs.country === "BR" ? "BRL" : "USD";

  const value = useMemo<UserPreferencesContextValue>(
    () => ({
      country: prefs.country,
      language: prefs.language,
      hydrated,
      currency,
      setPreferences,
      clearPreferences,
      suggestedCountry,
      requestRegionModal,
      regionModalRequestId,
    }),
    [
      prefs,
      hydrated,
      currency,
      setPreferences,
      clearPreferences,
      suggestedCountry,
      requestRegionModal,
      regionModalRequestId,
    ],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useUserPreferences(): UserPreferencesContextValue {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error("useUserPreferences must be used within UserPreferencesProvider");
  }
  return ctx;
}
