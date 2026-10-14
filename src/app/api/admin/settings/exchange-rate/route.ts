import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, isAdminError } from "@/lib/admin";
import {
  EXCHANGE_RATE_MARKUP_MAX,
  getExchangeRateConfig,
  setExchangeRateConfig,
  type ExchangeRateConfig,
} from "@/lib/app-settings";
import {
  getEffectiveBrlRate,
  revalidateExchangeRateConfig,
} from "@/lib/exchange-rate-server";

/**
 * GET  /api/admin/settings/exchange-rate — current config + live preview
 * PUT  /api/admin/settings/exchange-rate — update config (superadmin)
 */
export async function GET() {
  const adminResult = await requireSuperAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const [config, effective] = await Promise.all([
    getExchangeRateConfig(),
    getEffectiveBrlRate(),
  ]);

  return NextResponse.json({
    config,
    effective: {
      rate: effective.rate,
      baseRate: effective.baseRate,
      source: effective.source,
      liveTimestamp: effective.liveTimestamp,
    },
  });
}

export async function PUT(req: NextRequest) {
  const adminResult = await requireSuperAdmin();
  if (isAdminError(adminResult)) return adminResult;

  let body: Partial<ExchangeRateConfig>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode = body.mode === "fixed" ? "fixed" : "dynamic";
  const fixed_rate = Number(body.fixed_rate);
  const markup_percent = Number(body.markup_percent);

  if (!Number.isFinite(fixed_rate) || fixed_rate <= 0 || fixed_rate >= 1000) {
    return NextResponse.json(
      { error: "fixed_rate must be a positive number below 1000" },
      { status: 400 }
    );
  }
  if (
    !Number.isFinite(markup_percent) ||
    markup_percent < 0 ||
    markup_percent > EXCHANGE_RATE_MARKUP_MAX
  ) {
    return NextResponse.json(
      {
        error: `markup_percent must be between 0 and ${EXCHANGE_RATE_MARKUP_MAX}`,
      },
      { status: 400 }
    );
  }

  const result = await setExchangeRateConfig(
    { mode, fixed_rate, markup_percent },
    adminResult.userId
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Bust the cached config so PriceDisplay and checkout pick up the new
  // values immediately. The live USD-BRL quote cache stays warm.
  revalidateExchangeRateConfig();

  const effective = await getEffectiveBrlRate();
  return NextResponse.json({
    ok: true,
    config: result.value,
    effective: {
      rate: effective.rate,
      baseRate: effective.baseRate,
      source: effective.source,
      liveTimestamp: effective.liveTimestamp,
    },
  });
}
