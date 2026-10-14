"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export interface FilterChipOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  options: FilterChipOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
}

/**
 * Filtro segmentado em pílulas com scroll horizontal (snap) — substitui
 * Selects de status em listas. Hit-area de 44px, indicador ativo animado.
 */
export function FilterChips({
  options,
  value,
  onChange,
  className,
  "aria-label": ariaLabel = "Filtrar",
}: FilterChipsProps) {
  const layoutId = useId();
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex snap-x items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-1 -mb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (active) return;
              haptic("tick");
              onChange(opt.value);
            }}
            className={cn(
              "relative shrink-0 snap-start whitespace-nowrap rounded-full px-3.5 py-2.5 text-[13px] font-medium transition-colors min-h-11",
              active
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={reduceMotion ? undefined : layoutId}
                className="absolute inset-x-0 inset-y-1 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                aria-hidden
              />
            )}
            {!active && (
              <span
                className="absolute inset-x-0 inset-y-1 rounded-full border bg-background"
                aria-hidden
              />
            )}
            <span className="relative z-10">
              {opt.label}
              {opt.count !== undefined && (
                <span
                  className={cn(
                    "ml-1.5 font-mono text-[11px] tabular-nums",
                    active ? "text-primary-foreground/80" : "text-muted-foreground/70"
                  )}
                >
                  {opt.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
