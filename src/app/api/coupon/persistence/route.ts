import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  getCouponPersistenceDays,
  DEFAULT_PERSISTENCE_DAYS,
} from "@/lib/coupon-persistence";

/**
 * GET /api/coupon/persistence?code=CODE — returns `{ days }`, the cookie
 * persistence window for the given coupon code. Public, read-only: client-side
 * cookie writers (welcome strip, exit-intent, affiliate capture, flash sale)
 * call this to size the `affiliate_coupon` cookie's max-age. Unknown codes
 * fall back to the default window so behavior is preserved.
 */
export async function GET(req: NextRequest) {
  const rl = await rateLimit(`coupon-persist:${getClientIp(req)}`, 60, 60);
  if (!rl.allowed) return rl.response!;

  const code = req.nextUrl.searchParams.get("code")?.trim() ?? "";
  if (!code) {
    return NextResponse.json({ days: DEFAULT_PERSISTENCE_DAYS });
  }

  const days = await getCouponPersistenceDays(code);
  return NextResponse.json({ days });
}
