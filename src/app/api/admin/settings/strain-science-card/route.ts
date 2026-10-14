import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireSuperAdmin, isAdminError } from "@/lib/admin";
import {
  getStrainScienceCardEnabled,
  setStrainScienceCardEnabled,
} from "@/lib/app-settings";

/**
 * GET /api/admin/settings/strain-science-card — read whether the rich card
 *    is enabled (any admin can read).
 * PUT /api/admin/settings/strain-science-card — toggle (superadmin only).
 *
 * The setting controls the product detail page: enabled renders the
 * industrial "Ciência do Fenótipo" card; disabled renders a plain
 * 2-column label/value table with the same data.
 */
export async function GET() {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const enabled = await getStrainScienceCardEnabled();
  return NextResponse.json({ enabled });
}

export async function PUT(req: NextRequest) {
  const adminResult = await requireSuperAdmin();
  if (isAdminError(adminResult)) return adminResult;

  let body: { enabled?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: "enabled must be a boolean" },
      { status: 400 }
    );
  }

  const result = await setStrainScienceCardEnabled(
    body.enabled,
    adminResult.userId
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, value: result.value });
}
