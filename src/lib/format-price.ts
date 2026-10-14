export function formatPrice(
  cents: number,
  locale: string,
  currency: "USD" | "BRL" | "EUR" = "USD"
) {
  const loc = locale === "pt" ? "pt-BR" : locale === "es" ? "es-ES" : "en-US";
  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function calculateDiscountedPrice(
  priceCents: number,
  discountType: string | null | undefined,
  discountValue: number | null | undefined
): number {
  if (!discountType || !discountValue || discountValue <= 0) return priceCents;
  if (discountType === "percentage") {
    return Math.max(0, Math.round(priceCents * (1 - discountValue / 100)));
  }
  // fixed: discountValue is in USD cents
  return Math.max(0, priceCents - discountValue);
}

export function isPromotionActive(
  onSale: boolean | null | undefined,
  saleEndsAt: string | null | undefined
): boolean {
  if (!onSale) return false;
  if (!saleEndsAt) return true;
  return new Date(saleEndsAt) > new Date();
}
