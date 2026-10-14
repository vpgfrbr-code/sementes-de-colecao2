import { unstable_cache, revalidateTag } from "next/cache";
import {
  getExchangeRateConfig,
  type ExchangeRateConfig,
} from "@/lib/app-settings";

/**
 * Single source of truth for USD → BRL conversion.
 *
 * Both the public `/api/exchange-rate` endpoint (consumed by `PriceDisplay`
 * on every product page) and the `/api/checkout` route resolve their rate
 * through `getEffectiveBrlRate()`. This guarantees the BRL price the
 * customer sees on the storefront is exactly the BRL price they are
 * charged when they finalize the order.
 *
 * Two modes (configured by superadmin in /admin/configuracoes):
 *   * "fixed":   always returns config.fixed_rate.
 *   * "dynamic": fetches live USDBRL bid from awesomeapi (cached 1h),
 *                multiplies by (1 + markup_percent / 100). Falls back to
 *                config.fixed_rate when the API is unreachable.
 */

export const EXCHANGE_RATE_CONFIG_TAG = "exchange-rate-config";
const LIVE_RATE_TAG = "exchange-rate-live";

export type EffectiveRateSource = "fixed" | "dynamic" | "fallback";

export interface EffectiveBrlRate {
  /** BRL per 1 USD that the storefront and checkout will both apply. */
  rate: number;
  /** Live API rate before markup; null when mode='fixed' or API failed. */
  baseRate: number | null;
  /** Markup applied on top of baseRate (only meaningful for dynamic mode). */
  markupPercent: number;
  /** Origin of the returned rate. */
  source: EffectiveRateSource;
  /** ISO timestamp of the live quote when available. */
  liveTimestamp: string | null;
  /** Snapshot of the resolved config (for diagnostics / admin preview). */
  config: ExchangeRateConfig;
}

interface LiveRate {
  rate: number;
  timestamp: string;
}

// Cache the live USDBRL bid for an hour. Keyed independently of the config
// so admin saves only invalidate the config (cheap) and not the upstream
// quote (which doesn't change that often).
const fetchLiveUsdBrl = unstable_cache(
  async (): Promise<LiveRate | null> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(
        "https://economia.awesomeapi.com.br/json/last/USD-BRL",
        { signal: controller.signal, cache: "no-store" }
      );
      clearTimeout(timeout);
      if (!res.ok) return null;
      const data = await res.json();
      const rate = parseFloat(data?.USDBRL?.bid);
      if (!Number.isFinite(rate) || rate <= 0) return null;
      return {
        rate,
        timestamp: data?.USDBRL?.create_date ?? new Date().toISOString(),
      };
    } catch {
      return null;
    }
  },
  ["live-usd-brl"],
  { revalidate: 3600, tags: [LIVE_RATE_TAG] }
);

// Cache the resolved config briefly. revalidateExchangeRateConfig() purges
// this whenever an admin saves new settings so the storefront updates
// without waiting for TTL expiry.
const cachedConfig = unstable_cache(
  async () => getExchangeRateConfig(),
  ["exchange-rate-config"],
  { revalidate: 300, tags: [EXCHANGE_RATE_CONFIG_TAG] }
);

/**
 * Resolves the BRL-per-USD rate that both display and checkout must use.
 * Always returns a positive finite number; never throws.
 */
export async function getEffectiveBrlRate(): Promise<EffectiveBrlRate> {
  const config = await cachedConfig();

  if (config.mode === "fixed") {
    return {
      rate: config.fixed_rate,
      baseRate: null,
      markupPercent: 0,
      source: "fixed",
      liveTimestamp: null,
      config,
    };
  }

  const live = await fetchLiveUsdBrl();
  if (!live) {
    return {
      rate: config.fixed_rate,
      baseRate: null,
      markupPercent: 0,
      source: "fallback",
      liveTimestamp: null,
      config,
    };
  }

  const rate = live.rate * (1 + config.markup_percent / 100);
  return {
    rate,
    baseRate: live.rate,
    markupPercent: config.markup_percent,
    source: "dynamic",
    liveTimestamp: live.timestamp,
    config,
  };
}

/** Invalidate the cached config after an admin save. */
export function revalidateExchangeRateConfig(): void {
  // Next 16 requires a cache-life profile; expire immediately so the next
  // request reads the freshly-written config.
  revalidateTag(EXCHANGE_RATE_CONFIG_TAG, { expire: 0 });
}
