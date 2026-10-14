import { cache } from "react";
import { createServerClient } from "@/lib/supabase/server";

export type BrandingMode = "image" | "text";

export interface BrandingSettings {
  mode: BrandingMode;
  brandName: string;
  logoUrl: string;
  logoInverseUrl: string;
  faviconUrl: string;
  ogImageUrl: string;
}

export interface BrandingSettingsRaw {
  mode: BrandingMode;
  brandName: string;
  logoUrl: string | null;
  logoInverseUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
}

export const BRANDING_KEY = "branding";

export const BRANDING_FALLBACKS = {
  brandName: "Sementes de Coleção",
  logoUrl: "/logo.svg",
  logoInverseUrl: "/logo.svg",
  faviconUrl: "/favicon.svg",
  ogImageUrl: "/images/opengraph-semente1.png",
} as const;

function sanitizeRaw(
  v: Partial<BrandingSettingsRaw> | null | undefined
): BrandingSettingsRaw {
  const mode: BrandingMode = v?.mode === "text" ? "text" : "image";
  const brandName =
    typeof v?.brandName === "string" && v.brandName.trim().length > 0
      ? v.brandName.trim().slice(0, 80)
      : BRANDING_FALLBACKS.brandName;
  const url = (raw: unknown): string | null => {
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (!/^https?:\/\//i.test(trimmed)) return null;
    return trimmed;
  };
  return {
    mode,
    brandName,
    logoUrl: url(v?.logoUrl),
    logoInverseUrl: url(v?.logoInverseUrl),
    faviconUrl: url(v?.faviconUrl),
    ogImageUrl: url(v?.ogImageUrl),
  };
}

function resolveFallbacks(raw: BrandingSettingsRaw): BrandingSettings {
  return {
    mode: raw.mode,
    brandName: raw.brandName,
    logoUrl: raw.logoUrl ?? BRANDING_FALLBACKS.logoUrl,
    logoInverseUrl:
      raw.logoInverseUrl ?? BRANDING_FALLBACKS.logoInverseUrl,
    faviconUrl: raw.faviconUrl ?? BRANDING_FALLBACKS.faviconUrl,
    ogImageUrl: raw.ogImageUrl ?? BRANDING_FALLBACKS.ogImageUrl,
  };
}

async function fetchRaw(): Promise<BrandingSettingsRaw> {
  try {
    const supabase = createServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("app_settings")
      .select("value")
      .eq("key", BRANDING_KEY)
      .maybeSingle();
    return sanitizeRaw(
      data?.value as Partial<BrandingSettingsRaw> | undefined
    );
  } catch {
    return sanitizeRaw(null);
  }
}

/**
 * Reads the current branding config. Wrapped in React.cache so multiple
 * server components within a single request share one query, but no
 * cross-request caching exists — superadmin saves are visible on the
 * next SSR with no manual revalidation.
 */
export const getBrandingSettings = cache(
  async (): Promise<BrandingSettings> => {
    const raw = await fetchRaw();
    return resolveFallbacks(raw);
  }
);

/**
 * Same as getBrandingSettings but preserves null URLs so the admin UI can
 * tell "default" apart from "customized" when rendering the uploaders.
 */
export const getBrandingSettingsRaw = cache(
  async (): Promise<BrandingSettingsRaw> => fetchRaw()
);

/**
 * Writes the branding config. Caller must have authorized the user as
 * superadmin and validated the payload. Returns the persisted (post-
 * sanitization) value or an error string.
 */
export async function setBrandingSettings(
  patch: Partial<BrandingSettingsRaw>,
  updatedBy: string | null
): Promise<
  | { ok: true; value: BrandingSettingsRaw }
  | { ok: false; error: string }
> {
  const value = sanitizeRaw(patch);
  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("app_settings").upsert(
    {
      key: BRANDING_KEY,
      value,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    },
    { onConflict: "key" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true, value };
}

/**
 * Prefixes site-relative URLs ("/foo.svg") with the public site origin so
 * they work in emails and Open Graph tags. URLs that already include a
 * scheme are returned as-is.
 */
export function toAbsoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
    "https://sementesdecolecao.com";
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${clean}`;
}
