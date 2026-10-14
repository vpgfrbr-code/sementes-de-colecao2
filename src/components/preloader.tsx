"use client";

import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";

const PRELOADED_KEY = "__preloaded";

function hasPreloadedFlag() {
  try {
    return sessionStorage.getItem(PRELOADED_KEY) === "1";
  } catch {
    return false;
  }
}

function setPreloadedFlag() {
  try {
    sessionStorage.setItem(PRELOADED_KEY, "1");
  } catch {
    // Ignore storage failures on restricted browsers/private mode.
  }
}

export function Preloader() {
  const MIN_DISPLAY_MS = 0;
  const MAX_DISPLAY_MS = 600;
  const FADE_DURATION_MS = 300;

  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    let skipTimer: ReturnType<typeof setTimeout> | undefined;

    if (hasPreloadedFlag()) {
      // Defer state update to avoid synchronous setState in effect.
      skipTimer = setTimeout(() => setVisible(false), 0);
      return () => {
        if (skipTimer) clearTimeout(skipTimer);
      };
    }

    if (!visible) return;

    let minTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let rafA = 0;
    let rafB = 0;

    const dismiss = () => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      setFadeOut(true);
      setPreloadedFlag();
      hideTimer = setTimeout(() => setVisible(false), FADE_DURATION_MS);
    };

    const maxTimer = setTimeout(dismiss, MAX_DISPLAY_MS);

    // Wait for two frames to ensure the preloader paints before fade-out.
    rafA = window.requestAnimationFrame(() => {
      rafB = window.requestAnimationFrame(() => {
        minTimer = setTimeout(dismiss, MIN_DISPLAY_MS);
      });
    });

    return () => {
      window.cancelAnimationFrame(rafA);
      window.cancelAnimationFrame(rafB);
      if (minTimer) clearTimeout(minTimer);
      clearTimeout(maxTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[110] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <BrandLogo
        width={180}
        height={60}
        className="mb-8 dark:invert"
        imageClassName="!h-auto !w-auto"
        textClassName="mb-8 text-3xl"
        priority
      />
      {/* Industrial ruled-line progress bar */}
      <div className="w-40 overflow-hidden border-y border-foreground/20">
        <div className="h-0.5 w-full origin-left animate-[grow_1.5s_ease-in-out_infinite] bg-foreground/40" />
      </div>
    </div>
  );
}
