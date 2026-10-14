import { createServerClient } from "@/lib/supabase/server";

export interface DefaultResellerAttribution {
  enabled: boolean;
  reseller_user_id: string | null;
  commission_percent: number;
}

const DEFAULT: DefaultResellerAttribution = {
  enabled: false,
  reseller_user_id: null,
  commission_percent: 25,
};

export const DEFAULT_RESELLER_ATTRIBUTION_KEY = "default_reseller_attribution";

/**
 * Reads the "default reseller attribution" setting. When enabled, every
 * checkout without a coupon is attributed to the configured reseller for
 * commission reporting. Never affects buyer pricing.
 */
export async function getDefaultResellerAttribution(): Promise<DefaultResellerAttribution> {
  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("app_settings")
    .select("value")
    .eq("key", DEFAULT_RESELLER_ATTRIBUTION_KEY)
    .maybeSingle();

  if (!data?.value) return DEFAULT;

  const v = data.value as Partial<DefaultResellerAttribution>;
  return {
    enabled: !!v.enabled,
    reseller_user_id:
      typeof v.reseller_user_id === "string" ? v.reseller_user_id : null,
    commission_percent:
      typeof v.commission_percent === "number" &&
      v.commission_percent >= 0 &&
      v.commission_percent <= 100
        ? v.commission_percent
        : DEFAULT.commission_percent,
  };
}

// ---------------------------------------------------------------------------
// Exchange rate config (USD → BRL)
// ---------------------------------------------------------------------------

export type ExchangeRateMode = "fixed" | "dynamic";

export interface ExchangeRateConfig {
  /** "fixed": always use fixed_rate. "dynamic": live rate × (1 + markup%). */
  mode: ExchangeRateMode;
  /** BRL per 1 USD. Also used as fallback when the live API fails. */
  fixed_rate: number;
  /** Percent added on top of the live rate when mode = "dynamic". 0–50. */
  markup_percent: number;
}

export const EXCHANGE_RATE_CONFIG_KEY = "exchange_rate_config";

const DEFAULT_EXCHANGE_RATE_CONFIG: ExchangeRateConfig = {
  mode: "dynamic",
  fixed_rate: 5.5,
  markup_percent: 10,
};

export const EXCHANGE_RATE_MARKUP_MAX = 50;

function sanitizeExchangeRateConfig(
  v: Partial<ExchangeRateConfig> | null | undefined
): ExchangeRateConfig {
  if (!v) return DEFAULT_EXCHANGE_RATE_CONFIG;
  const mode: ExchangeRateMode = v.mode === "fixed" ? "fixed" : "dynamic";
  const fixed_rate =
    typeof v.fixed_rate === "number" && v.fixed_rate > 0 && v.fixed_rate < 1000
      ? v.fixed_rate
      : DEFAULT_EXCHANGE_RATE_CONFIG.fixed_rate;
  const markup_percent =
    typeof v.markup_percent === "number" &&
    v.markup_percent >= 0 &&
    v.markup_percent <= EXCHANGE_RATE_MARKUP_MAX
      ? v.markup_percent
      : DEFAULT_EXCHANGE_RATE_CONFIG.markup_percent;
  return { mode, fixed_rate, markup_percent };
}

/**
 * Reads the current USD→BRL exchange rate config. Both the public
 * /api/exchange-rate endpoint (for PriceDisplay) and the checkout API
 * resolve their effective rate through this single source of truth so the
 * displayed price always matches the amount charged.
 */
export async function getExchangeRateConfig(): Promise<ExchangeRateConfig> {
  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("app_settings")
    .select("value")
    .eq("key", EXCHANGE_RATE_CONFIG_KEY)
    .maybeSingle();

  return sanitizeExchangeRateConfig(
    data?.value as Partial<ExchangeRateConfig> | undefined
  );
}

/**
 * Writes the exchange rate config. Caller is responsible for superadmin
 * authorization and for invalidating the "exchange-rate-config" cache tag.
 */
export async function setExchangeRateConfig(
  config: ExchangeRateConfig,
  updatedBy: string | null
): Promise<{ ok: true; value: ExchangeRateConfig } | { ok: false; error: string }> {
  const value = sanitizeExchangeRateConfig(config);
  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("app_settings").upsert(
    {
      key: EXCHANGE_RATE_CONFIG_KEY,
      value,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    },
    { onConflict: "key" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true, value };
}

// ---------------------------------------------------------------------------
// Welcome coupon promo (bottom strip + exit-intent modal)
// ---------------------------------------------------------------------------

export interface WelcomeCouponPromo {
  /** When false, the strip and exit-intent modal do not render. */
  enabled: boolean;
  /** Coupon code displayed/copied. Stored in uppercase, trimmed. */
  coupon_code: string;
  /** Discount percent shown in the UI. Integer 1–100. */
  discount_percent: number;
}

export const WELCOME_COUPON_PROMO_KEY = "welcome_coupon_promo";

const DEFAULT_WELCOME_COUPON_PROMO: WelcomeCouponPromo = {
  enabled: false,
  coupon_code: "BEMVINDO10",
  discount_percent: 10,
};

function sanitizeWelcomeCouponPromo(
  v: Partial<WelcomeCouponPromo> | null | undefined
): WelcomeCouponPromo {
  if (!v) return DEFAULT_WELCOME_COUPON_PROMO;
  const code =
    typeof v.coupon_code === "string" && v.coupon_code.trim().length > 0
      ? v.coupon_code.trim().toUpperCase().slice(0, 32)
      : DEFAULT_WELCOME_COUPON_PROMO.coupon_code;
  const percentRaw = Number(v.discount_percent);
  const percent =
    Number.isFinite(percentRaw) && percentRaw >= 1 && percentRaw <= 100
      ? Math.round(percentRaw)
      : DEFAULT_WELCOME_COUPON_PROMO.discount_percent;
  return {
    enabled: !!v.enabled,
    coupon_code: code,
    discount_percent: percent,
  };
}

/**
 * Reads the welcome coupon promo setting. Used by the root layout to decide
 * whether to render the welcome strip + exit-intent modal and which code/
 * percent to display.
 */
export async function getWelcomeCouponPromo(): Promise<WelcomeCouponPromo> {
  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("app_settings")
    .select("value")
    .eq("key", WELCOME_COUPON_PROMO_KEY)
    .maybeSingle();

  return sanitizeWelcomeCouponPromo(
    data?.value as Partial<WelcomeCouponPromo> | undefined
  );
}

/**
 * Writes the welcome coupon promo setting. Caller is responsible for admin
 * authorization.
 */
export async function setWelcomeCouponPromo(
  config: WelcomeCouponPromo,
  updatedBy: string | null
): Promise<{ ok: true; value: WelcomeCouponPromo } | { ok: false; error: string }> {
  const value = sanitizeWelcomeCouponPromo(config);
  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("app_settings").upsert(
    {
      key: WELCOME_COUPON_PROMO_KEY,
      value,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    },
    { onConflict: "key" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true, value };
}

// ---------------------------------------------------------------------------
// Strain science card display toggle
// ---------------------------------------------------------------------------

export const STRAIN_SCIENCE_CARD_KEY = "strain_science_card_enabled";

const DEFAULT_STRAIN_SCIENCE_CARD_ENABLED = true;

/**
 * Returns whether the rich "Ciência do Fenótipo" card should render. When
 * false, the product page falls back to a plain 2-column label/value table
 * with the same underlying data.
 */
export async function getStrainScienceCardEnabled(): Promise<boolean> {
  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("app_settings")
    .select("value")
    .eq("key", STRAIN_SCIENCE_CARD_KEY)
    .maybeSingle();

  const v = data?.value as { enabled?: unknown } | undefined;
  if (typeof v?.enabled === "boolean") return v.enabled;
  return DEFAULT_STRAIN_SCIENCE_CARD_ENABLED;
}

export async function setStrainScienceCardEnabled(
  enabled: boolean,
  updatedBy: string | null
): Promise<{ ok: true; value: { enabled: boolean } } | { ok: false; error: string }> {
  const value = { enabled: !!enabled };
  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("app_settings").upsert(
    {
      key: STRAIN_SCIENCE_CARD_KEY,
      value,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    },
    { onConflict: "key" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true, value };
}
