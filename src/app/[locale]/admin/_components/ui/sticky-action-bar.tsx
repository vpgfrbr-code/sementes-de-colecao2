"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * Barra de ação fixa acima do bottom nav (mobile-only) para a ação primária
 * contextual de páginas de detalhe — ex.: "Aprovar pagamento".
 *
 * Regra de coordenação: ocupa o MESMO slot da AdminMobileSaveBar
 * (bottom-[calc(4rem+env(safe-area-inset-bottom))], z-60). Uma página deve
 * renderizar StickyActionBar OU registrar o save global
 * (useAdminSaveRegistration) com `visible` — nunca os dois ao mesmo tempo.
 */
export function StickyActionBar({
  children,
  show = true,
}: {
  children: React.ReactNode;
  show?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={reduceMotion ? false : { y: 72, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduceMotion ? undefined : { y: 72, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="fixed inset-x-0 z-[60] border-t border-foreground/10 bg-background/95 px-4 py-3 backdrop-blur md:hidden bottom-[calc(4rem+env(safe-area-inset-bottom))]"
        >
          <div className="mx-auto flex max-w-7xl items-center gap-2">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
