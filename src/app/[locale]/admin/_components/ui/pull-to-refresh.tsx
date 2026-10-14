"use client";

import * as React from "react";
import { RotateCw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { haptic } from "@/lib/haptics";

const PULL_THRESHOLD = 70;
const MAX_PULL = 110;

/**
 * Pull-to-refresh touch-only, sem lib: acompanha o arrasto a partir do topo
 * da página (window.scrollY === 0) e dispara `onRefresh` ao soltar além do
 * limiar. Em desktop (sem touch) renderiza os children direto.
 */
export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const [pull, setPull] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const startY = React.useRef<number | null>(null);
  const pulling = React.useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (refreshing || window.scrollY > 0) return;
    startY.current = e.touches[0]?.clientY ?? null;
    pulling.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (refreshing || startY.current === null) return;
    const touchY = e.touches[0]?.clientY;
    if (touchY === undefined) return;
    const delta = touchY - startY.current;
    if (delta <= 0 || window.scrollY > 0) {
      if (!pulling.current) startY.current = null;
      return;
    }
    pulling.current = true;
    // Resistência: o indicador anda mais devagar que o dedo.
    setPull(Math.min(MAX_PULL, delta * 0.45));
  };

  const onTouchEnd = async () => {
    const distance = pull;
    startY.current = null;
    pulling.current = false;
    if (distance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(PULL_THRESHOLD * 0.7);
      haptic("tick");
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  const armed = pull >= PULL_THRESHOLD;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        aria-hidden={pull === 0 && !refreshing}
        className="pointer-events-none flex items-end justify-center overflow-hidden md:hidden"
        style={{
          height: pull,
          transition: pulling.current ? "none" : "height 200ms ease-out",
        }}
      >
        <motion.span
          animate={
            refreshing && !reduceMotion
              ? { rotate: 360 }
              : { rotate: pull * 2.5 }
          }
          transition={
            refreshing
              ? { repeat: Infinity, duration: 0.8, ease: "linear" }
              : { duration: 0 }
          }
          className={`mb-3 flex size-8 items-center justify-center rounded-full border bg-background shadow-sm ${
            armed || refreshing ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <RotateCw className="size-4" aria-hidden />
        </motion.span>
      </div>
      {children}
    </div>
  );
}
