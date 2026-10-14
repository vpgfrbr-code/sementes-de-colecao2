"use client";

import { formatPrice } from "@/lib/format-price";
import { useExchangeRate } from "@/lib/exchange-rate";
import { useLocale } from "next-intl";
import { useUserPreferences } from "@/lib/user-preferences";

interface PriceDisplayProps {
  usdCents: number;
  /** Original price before discount — when present, shows strikethrough */
  originalUsdCents?: number;
  /** Primary price size variant */
  size?: "sm" | "base" | "lg" | "xl";
  className?: string;
  /** Override the default price text color (e.g. for dark backgrounds) */
  priceClassName?: string;
}

const PRIMARY_SIZE = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-2xl md:text-3xl",
} as const;

const SECONDARY_SIZE = {
  sm: "text-xs",
  base: "text-xs",
  lg: "text-sm",
  xl: "text-base",
} as const;

export function PriceDisplay({
  usdCents,
  originalUsdCents,
  size = "base",
  className,
  priceClassName,
}: PriceDisplayProps) {
  const locale = useLocale();
  const { rates, convertToBRL } = useExchangeRate();
  const { country, hydrated, currency } = useUserPreferences();

  const hasDiscount = originalUsdCents !== undefined && originalUsdCents > usdCents;

  // Currency is derived from the shipping country (Brazil → BRL, else USD).
  // Before hydration of the user-preferences cookie, fall back to locale to
  // avoid a visible flash: pt → BRL (matches the default market), others → USD.
  const useBRL = hydrated ? currency === "BRL" : locale === "pt";

  function formatForLocale(cents: number): string {
    if (useBRL && rates.brl) {
      return formatPrice(convertToBRL(cents), locale, "BRL");
    }
    return formatPrice(cents, "en", "USD");
  }

  const primaryText = formatForLocale(usdCents);
  const originalText = hasDiscount ? formatForLocale(originalUsdCents) : null;

  const usdFormatted = formatPrice(usdCents, "en", "USD");
  // Show USD reference only if user explicitly chose a non-BR country but
  // we're still displaying BRL (edge case — currency should be USD then).
  const showSecondary = useBRL && country !== null && country !== "BR";

  return (
    <span className={className}>
      {originalText && (
        <span className={`font-mono line-through text-muted-foreground/60 mr-1.5 ${SECONDARY_SIZE[size]}`}>
          {originalText}
        </span>
      )}
      <span className={`font-mono font-semibold ${priceClassName ?? (hasDiscount ? "text-destructive" : "text-primary")} ${PRIMARY_SIZE[size]}`}>
        {primaryText}
      </span>
      {showSecondary && (
        <>
          {" "}
          <span className={`font-mono text-muted-foreground ${SECONDARY_SIZE[size]}`}>
            ({usdFormatted})
          </span>
        </>
      )}
    </span>
  );
}
