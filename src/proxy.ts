import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { getCouponPersistenceDays } from "@/lib/coupon-persistence";

const intlMiddleware = createMiddleware(routing);

const isProtectedRoute = createRouteMatcher([
  "/:locale/conta(.*)",
  "/:locale/admin(.*)",
]);

const AFFILIATE_COOKIE = "affiliate_coupon";

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();

  const refCode = req.nextUrl.searchParams.get("ref");

  // Skip i18n middleware for API routes
  if (req.nextUrl.pathname.startsWith("/api")) return;

  const response = intlMiddleware(req);

  // Set affiliate coupon cookie if ?ref= param is present. The cookie lasts as
  // long as the coupon's own persistence window (configured per coupon in
  // admin); unknown codes fall back to the default. One DB read happens only on
  // requests that carry ?ref=, not on general traffic.
  if (refCode) {
    const sanitized = refCode.trim().toUpperCase().slice(0, 50);
    if (sanitized) {
      const days = await getCouponPersistenceDays(sanitized);
      const res = response ?? NextResponse.next();
      res.cookies.set(AFFILIATE_COOKIE, sanitized, {
        path: "/",
        maxAge: days * 24 * 60 * 60,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: false,
      });
      return res;
    }
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
