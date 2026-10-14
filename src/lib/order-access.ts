import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Per-order access control for endpoints used by guests AND logged-in users
 * (status polling, "I paid" button, payment proof upload).
 *
 * Threat model: order IDs are UUID v4 (high entropy, not enumerable), but if
 * an order ID leaks (URL share, screenshot, browser history) any third party
 * could otherwise spam the report-payment endpoint, upload junk to Storage,
 * or scrape order status. We bind ownership to the browser that completed
 * the checkout via a signed HttpOnly cookie, and require Clerk-user match
 * for orders attached to a logged-in customer.
 */

const COOKIE_NAME = "sdc_order_access";
const COOKIE_TTL_DAYS = 14;

/**
 * Resolves the JWT secret at request time. Throws if missing in production
 * (we never want to sign with a known-default key on a real customer order).
 */
function getJwtSecret(): Uint8Array {
  const raw = process.env.ORDER_ACCESS_SECRET;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ORDER_ACCESS_SECRET env var is required in production"
      );
    }
    return new TextEncoder().encode("dev-only-do-not-use-in-prod");
  }
  return new TextEncoder().encode(raw);
}

interface OrderAccessPayload {
  orderIds: string[]; // list of orders the cookie grants access to
}

/**
 * Mints/extends the access cookie to include `orderId`. Call from checkout
 * after the order row has been created. Idempotent: if a previous valid
 * cookie exists, the new orderId is appended (capped at 20 entries).
 */
export async function grantOrderAccess(orderId: string): Promise<void> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;

  let orderIds: string[] = [];
  if (existing) {
    try {
      const { payload } = await jwtVerify(existing, getJwtSecret());
      const arr = (payload as { orderIds?: unknown }).orderIds;
      if (Array.isArray(arr)) {
        orderIds = arr.filter((x): x is string => typeof x === "string");
      }
    } catch {
      // Invalid/expired — start fresh.
    }
  }

  if (!orderIds.includes(orderId)) {
    orderIds.push(orderId);
    // Keep only the most recent 20 to bound cookie size.
    if (orderIds.length > 20) orderIds = orderIds.slice(-20);
  }

  const token = await new SignJWT({ orderIds } satisfies OrderAccessPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_TTL_DAYS}d`)
    .sign(getJwtSecret());

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_TTL_DAYS * 24 * 60 * 60,
  });
}

async function cookieGrantsAccess(orderId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const arr = (payload as { orderIds?: unknown }).orderIds;
    return Array.isArray(arr) && arr.includes(orderId);
  } catch {
    return false;
  }
}

/**
 * Verifies the current request is allowed to act on `orderId`.
 *
 * Rules:
 *  1. Order must exist (else 404).
 *  2. If the order is attached to a Clerk user, the request must come from
 *     that user (else 403).
 *  3. Else (guest order), the signed access cookie must include this orderId.
 *
 * Returns the order owner info on success; on failure returns a NextResponse
 * the caller should return immediately.
 */
export async function verifyOrderAccess(
  orderId: string
): Promise<
  | { ok: true; clerkUserId: string | null }
  | { ok: false; response: NextResponse }
> {
  const supabase = createServerClient();
  const { data: order } = await supabase
    .from("orders")
    .select("clerk_user_id")
    .eq("id", orderId)
    .single();

  if (!order) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  if (order.clerk_user_id) {
    const { userId } = await auth();
    if (!userId || userId !== order.clerk_user_id) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }
    return { ok: true, clerkUserId: order.clerk_user_id };
  }

  // Guest order — require the signed cookie.
  if (await cookieGrantsAccess(orderId)) {
    return { ok: true, clerkUserId: null };
  }

  return {
    ok: false,
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}
