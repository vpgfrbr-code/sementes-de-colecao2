"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminSave } from "./admin-save-context";

export function AdminMobileSaveBar() {
  const { state, triggerSave } = useAdminSave();
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {state.visible && (
        <motion.div
          initial={reduceMotion ? false : { y: 72, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduceMotion ? undefined : { y: 72, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="fixed inset-x-0 z-[60] border-t border-foreground/10 bg-background/95 px-4 py-3 backdrop-blur md:hidden bottom-[calc(4rem+env(safe-area-inset-bottom))]"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-foreground/70">
              {state.saving
                ? "Salvando…"
                : state.dirty
                  ? "Alterações não salvas"
                  : "Sem alterações pendentes"}
            </p>
            <Button
              size="sm"
              onClick={triggerSave}
              disabled={!state.dirty || !state.canSave || state.saving}
              className="h-11 rounded-full px-5 text-[11px] uppercase tracking-[0.1em]"
            >
              {state.saving ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 size-3.5" />
              )}
              {state.label}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
