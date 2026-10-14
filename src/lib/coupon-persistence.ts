import { createServerClient } from "@/lib/supabase/server";

/** Cookie persistence window applied when a coupon has no own value or is
 *  unknown (e.g. a free-text welcome code or arbitrary ?ref code). Matches the
 *  historical hardcoded duration so behavior is preserved by default. */
export const DEFAULT_PERSISTENCE_DAYS = 30;

/**
 * Resolves how many days the `affiliate_coupon` cookie should persist for a
 * given coupon code. Looks up the active coupon by code and returns its
 * `persistence_days`; falls back to {@link DEFAULT_PERSISTENCE_DAYS} when the
 * code is unknown, inactive, or the lookup fails.
 *
 * Used by the public /api/coupon/persistence endpoint (client writers) and by
 * the middleware when capturing a `?ref=` code. `createServerClient` is
 * fetch-based, so this is safe to call from the Edge middleware runtime.
 */
export async function getCouponPersistenceDays(code: string): Promise<number> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return DEFAULT_PERSISTENCE_DAYS;

  try {
    const supabase = createServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("coupons")
      .select("persistence_days")
      .eq("code", normalized)
      .eq("active", true)
      .maybeSingle();

    const days = Number(data?.persistence_days);
    if (Number.isFinite(days) && days >= 1 && days <= 365) {
      return Math.round(days);
    }
  } catch {
    // fail-open to the default window
  }

  return DEFAULT_PERSISTENCE_DAYS;
}
