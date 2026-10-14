import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAdminError } from "@/lib/admin";
import {
  getWelcomeCouponPromo,
  setWelcomeCouponPromo,
} from "@/lib/app-settings";

/**
 * GET /api/admin/settings/welcome-coupon — read current welcome coupon promo
 * PUT /api/admin/settings/welcome-coupon — update it (admin or superadmin)
 *
 * The setting controls whether the welcome bottom strip and exit-intent
 * modal render, and which coupon code / discount percent they display. The
 * coupon row in the `coupons` table is unaffected.
 */
export async function GET() {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const value = await getWelcomeCouponPromo();
  return NextResponse.json(value);
}

export async function PUT(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  let body: {
    enabled?: boolean;
    coupon_code?: string;
    discount_percent?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = (body.coupon_code ?? "").trim();
  if (!code) {
    return NextResponse.json(
      { error: "coupon_code is required" },
      { status: 400 }
    );
  }
  if (code.length > 32) {
    return NextResponse.json(
      { error: "coupon_code must be at most 32 characters" },
      { status: 400 }
    );
  }

  const percent = Number(body.discount_percent);
  if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
    return NextResponse.json(
      { error: "discount_percent must be between 1 and 100" },
      { status: 400 }
    );
  }

  const result = await setWelcomeCouponPromo(
    {
      enabled: !!body.enabled,
      coupon_code: code,
      discount_percent: percent,
    },
    adminResult.userId
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, value: result.value });
}
