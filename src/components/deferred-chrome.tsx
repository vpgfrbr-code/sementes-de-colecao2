"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { WelcomeCouponPromo } from "@/lib/app-settings";

// All of these components are client-only, rely on localStorage / cookies / user
// interaction and are NOT needed for LCP or above-the-fold rendering. Deferring
// their mount until the browser is idle (or after a short timeout fallback)
// keeps ~80–120kb of JS out of the critical path on mobile.

const CookieConsent = dynamic(
  () => import("./cookie-consent").then((m) => ({ default: m.CookieConsent })),
  { ssr: false },
);

const AgeGate = dynamic(
  () => import("./age-gate").then((m) => ({ default: m.AgeGate })),
  { ssr: false },
);

const WelcomeRegionModal = dynamic(
  () =>
    import("./welcome-region-modal").then((m) => ({
      default: m.WelcomeRegionModal,
    })),
  { ssr: false },
);

const ExitIntentModal = dynamic(
  () =>
    import("./exit-intent-modal").then((m) => ({ default: m.ExitIntentModal })),
  { ssr: false },
);

const WelcomeCouponStrip = dynamic(
  () =>
    import("./welcome-coupon-strip").then((m) => ({
      default: m.WelcomeCouponStrip,
    })),
  { ssr: false },
);

const AffiliateCouponCapture = dynamic(
  () =>
    import("./affiliate-coupon-capture").then((m) => ({
      default: m.AffiliateCouponCapture,
    })),
  { ssr: false },
);

const AddToCartConfirmation = dynamic(
  () =>
    import("./cart/add-to-cart-confirmation").then((m) => ({
      default: m.AddToCartConfirmation,
    })),
  { ssr: false },
);

const Toaster = dynamic(
  () => import("./ui/sonner").then((m) => ({ default: m.Toaster })),
  { ssr: false },
);

type IdleCallback = (handle: number) => void;
type IdleRequester = (cb: () => void, opts?: { timeout: number }) => number;

/**
 * Mounts non-critical UI (cookie banner, age gate, region modal, exit-intent,
 * affiliate capture, toaster, etc.) only after the browser is idle. Falls back
 * to a 1.5s timeout so these still render reliably on browsers without
 * `requestIdleCallback`.
 */
export function DeferredChrome({
  welcomePromo,
}: {
  welcomePromo: WelcomeCouponPromo;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;

    const win = window as Window & {
      requestIdleCallback?: IdleRequester;
      cancelIdleCallback?: IdleCallback;
    };

    let idleHandle: number | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const mount = () => setReady(true);

    if (typeof win.requestIdleCallback === "function") {
      idleHandle = win.requestIdleCallback(mount, { timeout: 2000 });
    } else {
      timeoutHandle = setTimeout(mount, 1500);
    }

    return () => {
      if (idleHandle !== undefined && typeof win.cancelIdleCallback === "function") {
        win.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <AffiliateCouponCapture />
      {welcomePromo.enabled && (
        <>
          <ExitIntentModal
            code={welcomePromo.coupon_code}
            percent={welcomePromo.discount_percent}
          />
          <WelcomeCouponStrip
            code={welcomePromo.coupon_code}
            percent={welcomePromo.discount_percent}
          />
        </>
      )}
      <CookieConsent />
      <AgeGate />
      <WelcomeRegionModal />
      <Toaster />
      <AddToCartConfirmation />
    </>
  );
}
