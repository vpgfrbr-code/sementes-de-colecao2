"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Transição de página do admin: fade + leve subida a cada navegação.
 * template.tsx remonta por rota — é o mecanismo do App Router para isso.
 */
export default function AdminTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
    >
      {children}
    </motion.div>
  );
}
