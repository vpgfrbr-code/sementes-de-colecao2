"use client";

import { useSyncExternalStore } from "react";

export type MobileState = "pending" | "mobile" | "desktop";

/**
 * Returns "pending" during SSR and initial hydration, then "mobile" or
 * "desktop" after the first post-hydration render. Letting the caller
 * render a neutral placeholder on "pending" avoids mounting the wrong
 * hero variant and triggering hundreds of frame fetches on phones.
 *
 * Uses `useSyncExternalStore` so we stay clean under the
 * `react-hooks/set-state-in-effect` lint rule.
 */
export function useMobileState(query = "(max-width: 767px)"): MobileState {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => (window.matchMedia(query).matches ? "mobile" : "desktop"),
    () => "pending",
  );
}
