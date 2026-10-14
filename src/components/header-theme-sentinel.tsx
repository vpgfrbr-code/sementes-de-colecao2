"use client";

import { useEffect, useRef } from "react";
import { useHeaderThemeStore } from "@/store/header-theme";

/**
 * Drop this invisible sentinel inside any section that should force the
 * header into dark mode while ANY PART of that section is in the viewport.
 *
 * Place it as a direct child of a `position: relative` container so that
 * `absolute inset-0` spans the full section height. Multiple sentinels are
 * additive — the header stays dark as long as at least one is intersecting.
 */
export function HeaderThemeSentinel() {
  const increment = useHeaderThemeStore((s) => s.increment);
  const decrement = useHeaderThemeStore((s) => s.decrement);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Track whether this sentinel is currently contributing to darkCount
    let contributing = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && !contributing) {
          contributing = true;
          increment();
        } else if (!entry.isIntersecting && contributing) {
          contributing = false;
          decrement();
        }
      },
      {
        threshold: 0,
        // Only consider the top ~20% of the viewport as the "active zone".
        // The inset-0 element (full section height) will only be intersecting
        // once the section's top edge has risen into this zone — i.e., the
        // section is actually at the top of the screen under the header.
        // This prevents the header from flipping dark when the section is
        // merely visible at the bottom of the screen while scrolling toward it.
        rootMargin: "0px 0px -80% 0px",
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      // If we were contributing on unmount (page navigation), release the count
      if (contributing) decrement();
    };
  }, [increment, decrement]);

  return (
    <div
      ref={ref}
      aria-hidden
      // Cover the full parent container so the observer fires only when
      // the ENTIRE section has scrolled off-screen, not just the top edge.
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
    />
  );
}
