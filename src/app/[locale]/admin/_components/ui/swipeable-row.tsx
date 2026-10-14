"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { motion, useAnimation } from "motion/react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export interface SwipeAction {
  label: string;
  icon: LucideIcon;
  onTrigger: () => void;
  /** Classes do painel revelado (ex.: "bg-primary text-primary-foreground"). */
  className?: string;
}

const TRIGGER_THRESHOLD = 80;
const MAX_DRAG = 112;

/**
 * Linha com ações por swipe (mobile): arrastar para a direita revela
 * `rightAction`, para a esquerda revela `leftAction`. Solta além de 80px →
 * dispara a ação e volta com spring. `dragDirectionLock` preserva o scroll
 * vertical da lista. Os children continuam clicáveis normalmente.
 */
export function SwipeableRow({
  children,
  rightAction,
  leftAction,
  className,
}: {
  children: React.ReactNode;
  rightAction?: SwipeAction;
  leftAction?: SwipeAction;
  className?: string;
}) {
  const controls = useAnimation();
  const [offset, setOffset] = React.useState(0);
  const fired = React.useRef(false);

  if (!rightAction && !leftAction) {
    return <div className={className}>{children}</div>;
  }

  const revealRight = offset > 8 && rightAction;
  const revealLeft = offset < -8 && leftAction;

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      {revealRight && (
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex w-28 items-center justify-start pl-4",
            offset >= TRIGGER_THRESHOLD ? "opacity-100" : "opacity-70",
            rightAction.className ?? "bg-primary text-primary-foreground"
          )}
          aria-hidden
        >
          <span className="flex flex-col items-center gap-1 text-[11px] font-medium">
            <rightAction.icon className="size-5" />
            {rightAction.label}
          </span>
        </div>
      )}
      {revealLeft && (
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex w-28 items-center justify-end pr-4",
            offset <= -TRIGGER_THRESHOLD ? "opacity-100" : "opacity-70",
            leftAction.className ?? "bg-secondary text-secondary-foreground"
          )}
          aria-hidden
        >
          <span className="flex flex-col items-center gap-1 text-[11px] font-medium">
            <leftAction.icon className="size-5" />
            {leftAction.label}
          </span>
        </div>
      )}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: leftAction ? -MAX_DRAG : 0, right: rightAction ? MAX_DRAG : 0 }}
        dragElastic={0.12}
        animate={controls}
        onDrag={(_, info) => {
          setOffset(info.offset.x);
          const beyond =
            (rightAction && info.offset.x >= TRIGGER_THRESHOLD) ||
            (leftAction && info.offset.x <= -TRIGGER_THRESHOLD);
          if (beyond && !fired.current) {
            fired.current = true;
            haptic("tick");
          } else if (!beyond) {
            fired.current = false;
          }
        }}
        onDragEnd={(_, info) => {
          if (rightAction && info.offset.x >= TRIGGER_THRESHOLD) {
            rightAction.onTrigger();
          } else if (leftAction && info.offset.x <= -TRIGGER_THRESHOLD) {
            leftAction.onTrigger();
          }
          fired.current = false;
          setOffset(0);
          controls.start({
            x: 0,
            transition: { type: "spring", stiffness: 420, damping: 34 },
          });
        }}
        className="relative touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
