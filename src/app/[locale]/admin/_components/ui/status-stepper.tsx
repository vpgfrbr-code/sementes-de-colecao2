"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export interface StatusStep {
  value: string;
  label: string;
}

interface StatusStepperProps {
  steps: StatusStep[];
  /** Status persistido do pedido. */
  current: string;
  /** Status selecionado mas ainda não salvo (estado dirty). */
  pendingValue?: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

/**
 * Timeline horizontal tocável para o status do pedido — substitui o Select.
 * Passos concluídos ficam preenchidos com primary; o passo selecionado mas
 * não salvo pulsa com um anel. Hit-area de 44px por passo.
 */
export function StatusStepper({
  steps,
  current,
  pendingValue,
  onSelect,
  disabled,
}: StatusStepperProps) {
  const reduceMotion = useReducedMotion();
  const currentIdx = steps.findIndex((s) => s.value === current);
  const selected = pendingValue ?? current;
  const selectedIdx = steps.findIndex((s) => s.value === selected);
  // Status fora da timeline (ex.: cancelado): nada preenchido.
  const fillIdx = selectedIdx >= 0 ? selectedIdx : -1;

  return (
    <div role="radiogroup" aria-label="Status do pedido" className="w-full">
      <div className="flex items-start">
        {steps.map((step, idx) => {
          const reached = idx <= fillIdx;
          const isSelected = idx === selectedIdx;
          const isDirty = isSelected && pendingValue !== undefined && pendingValue !== current;
          const isPersisted = idx === currentIdx && currentIdx === selectedIdx;
          return (
            <div key={step.value} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-colors duration-300",
                    idx === 0 ? "bg-transparent" : idx <= fillIdx ? "bg-primary" : "bg-border"
                  )}
                  aria-hidden
                />
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={disabled}
                  onClick={() => {
                    if (disabled || step.value === selected) return;
                    haptic("tick");
                    onSelect(step.value);
                  }}
                  className="relative flex size-11 shrink-0 items-center justify-center disabled:opacity-50"
                  title={step.label}
                >
                  {isDirty && !reduceMotion && (
                    <motion.span
                      className="absolute size-7 rounded-full border-2 border-primary/50"
                      animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ repeat: Infinity, duration: 1.6, ease: "easeOut" }}
                      aria-hidden
                    />
                  )}
                  <motion.span
                    animate={
                      reduceMotion
                        ? undefined
                        : { scale: isSelected ? 1.1 : 1 }
                    }
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors duration-300",
                      reached
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground",
                      isDirty && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                    )}
                  >
                    {reached && (isPersisted || idx < fillIdx) ? (
                      <Check className="size-3.5" aria-hidden />
                    ) : (
                      idx + 1
                    )}
                  </motion.span>
                </button>
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-colors duration-300",
                    idx === steps.length - 1
                      ? "bg-transparent"
                      : idx < fillIdx
                        ? "bg-primary"
                        : "bg-border"
                  )}
                  aria-hidden
                />
              </div>
              <span
                className={cn(
                  "mt-1 w-full truncate px-0.5 text-center text-[10px] leading-tight sm:text-[11px]",
                  isSelected
                    ? "font-semibold text-foreground"
                    : reached
                      ? "text-foreground/70"
                      : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
