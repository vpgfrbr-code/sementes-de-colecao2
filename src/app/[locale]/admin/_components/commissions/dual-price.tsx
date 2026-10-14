"use client";

import { formatPrice } from "@/lib/format-price";
import { useExchangeRate } from "@/lib/exchange-rate";

/**
 * Renders an USD amount with a BRL conversion underneath. Used in admin views
 * where seeing both currencies is important (e.g. commission payouts).
 */
export function DualPrice({
  usdCents,
  className,
  align = "right",
  prefix,
}: {
  usdCents: number;
  className?: string;
  align?: "right" | "left";
  prefix?: string;
}) {
  const { rates, convertToBRL } = useExchangeRate();
  const brlText = rates.brl
    ? formatPrice(convertToBRL(usdCents), "pt", "BRL")
    : null;
  return (
    <span
      className={`inline-flex flex-col ${align === "right" ? "items-end" : "items-start"} ${className ?? ""}`}
    >
      <span className="font-mono">
        {prefix ?? ""}
        {formatPrice(usdCents, "pt")}
      </span>
      {brlText && (
        <span className="text-[10px] text-muted-foreground font-mono">
          {brlText}
        </span>
      )}
    </span>
  );
}
