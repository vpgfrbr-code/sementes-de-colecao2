import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, requireSuperAdmin, isAdminError } from "@/lib/admin";
import {
  getBrandingSettings,
  getBrandingSettingsRaw,
  setBrandingSettings,
} from "@/lib/branding";

/**
 * GET /api/admin/settings/branding
 *   ?raw=1 — returns nulls for unset URLs so the UI can show a "default"
 *            badge. Without it, URLs are resolved to the code fallbacks.
 *
 * PUT /api/admin/settings/branding (superadmin only)
 *   Validates URLs and persists. The browser revalidates by reloading
 *   (router.refresh) — there is no cache tag to bust.
 */
export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const raw = req.nextUrl.searchParams.get("raw") === "1";
  const value = raw
    ? await getBrandingSettingsRaw()
    : await getBrandingSettings();
  return NextResponse.json(value);
}

const Schema = z.object({
  mode: z.enum(["image", "text"]),
  brandName: z.string().trim().min(1).max(80),
  logoUrl: z.string().url().nullable(),
  logoInverseUrl: z.string().url().nullable(),
  faviconUrl: z.string().url().nullable(),
  ogImageUrl: z.string().url().nullable(),
});

function isAllowedAssetUrl(url: string | null): boolean {
  if (url === null) return true;
  const allowedPrefix = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");
  if (!allowedPrefix) return false;
  return url.startsWith(`${allowedPrefix}/`);
}

export async function PUT(req: NextRequest) {
  const adminResult = await requireSuperAdmin();
  if (isAdminError(adminResult)) return adminResult;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 }
    );
  }

  const v = parsed.data;
  const urlsToCheck = [
    v.logoUrl,
    v.logoInverseUrl,
    v.faviconUrl,
    v.ogImageUrl,
  ];
  for (const u of urlsToCheck) {
    if (!isAllowedAssetUrl(u)) {
      return NextResponse.json(
        {
          error:
            "Asset URLs must point to the configured R2 public bucket.",
        },
        { status: 400 }
      );
    }
  }

  const result = await setBrandingSettings(v, adminResult.userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, value: result.value });
}
