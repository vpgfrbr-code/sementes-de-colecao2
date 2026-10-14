import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { log } from "@/lib/log";

/**
 * Fixed-window rate limiting backed by the `rate_limit_counters` Postgres
 * table (migration 036). Fail-open: if the DB call errors for any reason,
 * we let the request through — availability > strict limiting for now.
 */

export interface RateLimitResult {
  allowed: boolean;
  response?: NextResponse;
}

/**
 * Best-effort extraction of the caller's IP from Vercel/standard proxy
 * headers. Falls back to "unknown" so rate limiting still works in aggregate
 * (just loses per-IP granularity if headers are missing).
 */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

/**
 * Checks whether the caller identified by `key` is within `max` requests per
 * `windowSeconds`. Returns `{ allowed: true }` on success or `{ allowed:
 * false, response }` with a 429 NextResponse to return immediately.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const supabase = createServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("check_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      log.warn("[ratelimit] rpc error, failing open:", error.message);
      return { allowed: true };
    }

    if (data === false) {
      return {
        allowed: false,
        response: NextResponse.json(
          { error: "Too many requests. Please try again shortly." },
          {
            status: 429,
            headers: { "Retry-After": String(windowSeconds) },
          }
        ),
      };
    }

    return { allowed: true };
  } catch (err) {
    log.warn("[ratelimit] unexpected error, failing open:", err);
    return { allowed: true };
  }
}
