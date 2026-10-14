import { NextResponse } from "next/server";
import { getEffectiveBrlRate } from "@/lib/exchange-rate-server";

const FALLBACK_EUR = 0.92;

// BRL freshness is controlled inside getEffectiveBrlRate (admin-managed
// config + cached live quote). EUR uses Next's fetch-level cache below.
export const dynamic = "force-dynamic";

export async function GET() {
  const brl = await getEffectiveBrlRate();

  let eur = FALLBACK_EUR;
  let eurFallback = true;
  try {
    const res = await fetch(
      "https://economia.awesomeapi.com.br/json/last/USD-EUR",
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = await res.json();
      const parsed = parseFloat(data?.USDEUR?.bid);
      if (Number.isFinite(parsed) && parsed > 0) {
        eur = parsed;
        eurFallback = false;
      }
    }
  } catch {
    // keep fallback
  }

  return NextResponse.json({
    brl: brl.rate,
    eur,
    timestamp: brl.liveTimestamp ?? new Date().toISOString(),
    fallback: brl.source === "fallback" || eurFallback,
    brlSource: brl.source,
    brlMarkupPercent: brl.markupPercent,
    brlBaseRate: brl.baseRate,
  });
}
