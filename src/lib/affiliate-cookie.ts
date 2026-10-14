import { DEFAULT_PERSISTENCE_DAYS } from "@/lib/coupon-persistence";

const AFFILIATE_COOKIE = "affiliate_coupon";

/**
 * Fetches the per-coupon persistence window (days) for `code`. Falls back to
 * the default window on any network/parse error so the caller always gets a
 * usable value.
 */
async function fetchPersistenceDays(code: string): Promise<number> {
  try {
    const res = await fetch(
      `/api/coupon/persistence?code=${encodeURIComponent(code)}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data: { days?: number } = await res.json();
      const days = Number(data?.days);
      if (Number.isFinite(days) && days >= 1 && days <= 365) {
        return Math.round(days);
      }
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_PERSISTENCE_DAYS;
}

/**
 * Writes the `affiliate_coupon` cookie for `code` with a max-age that reflects
 * the coupon's own persistence window (configured per coupon in the admin).
 * Centralizes the cookie-writing logic shared by the welcome strip,
 * exit-intent modal, affiliate capture and flash-sale section.
 *
 * Returns the coupon code (trimmed, uppercased) that was persisted.
 */
export async function claimAffiliateCoupon(code: string): Promise<string> {
  const couponCode = code.trim().toUpperCase();
  if (!couponCode) return couponCode;

  const days = await fetchPersistenceDays(couponCode);
  const maxAge = days * 24 * 60 * 60;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:";

  document.cookie = `${AFFILIATE_COOKIE}=${encodeURIComponent(
    couponCode
  )}; path=/; max-age=${maxAge}; SameSite=Lax${secure ? "; Secure" : ""}`;

  return couponCode;
}
