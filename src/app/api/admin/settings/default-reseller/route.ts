import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireSuperAdmin, isAdminError } from "@/lib/admin";
import {
  DEFAULT_RESELLER_ATTRIBUTION_KEY,
  getDefaultResellerAttribution,
} from "@/lib/app-settings";

/**
 * GET  /api/admin/settings/default-reseller — read current setting
 * PUT  /api/admin/settings/default-reseller — update setting (superadmin)
 * POST /api/admin/settings/default-reseller/backfill — optional, see sibling route
 */
export async function GET() {
  const adminResult = await requireSuperAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const setting = await getDefaultResellerAttribution();
  return NextResponse.json(setting);
}

export async function PUT(req: NextRequest) {
  const adminResult = await requireSuperAdmin();
  if (isAdminError(adminResult)) return adminResult;

  let body: {
    enabled?: boolean;
    reseller_user_id?: string | null;
    commission_percent?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const enabled = !!body.enabled;
  const resellerUserId = body.reseller_user_id ?? null;
  const commissionPercent = Number(body.commission_percent);

  if (
    !Number.isFinite(commissionPercent) ||
    commissionPercent < 0 ||
    commissionPercent > 100
  ) {
    return NextResponse.json(
      { error: "commission_percent must be between 0 and 100" },
      { status: 400 }
    );
  }

  if (enabled && !resellerUserId) {
    return NextResponse.json(
      { error: "reseller_user_id is required when enabled" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  if (resellerUserId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reseller } = await (supabase as any)
      .from("resellers")
      .select("user_id, status")
      .eq("user_id", resellerUserId)
      .single();

    if (!reseller) {
      return NextResponse.json(
        { error: "Reseller not found" },
        { status: 404 }
      );
    }
    if (enabled && reseller.status !== "active") {
      return NextResponse.json(
        { error: "Reseller is not active" },
        { status: 400 }
      );
    }
  }

  const value = {
    enabled,
    reseller_user_id: resellerUserId,
    commission_percent: commissionPercent,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("app_settings").upsert(
    {
      key: DEFAULT_RESELLER_ATTRIBUTION_KEY,
      value,
      updated_at: new Date().toISOString(),
      updated_by: adminResult.userId,
    },
    { onConflict: "key" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, value });
}
