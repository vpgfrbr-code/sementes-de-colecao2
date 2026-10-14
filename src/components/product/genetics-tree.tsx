"use client";

import { motion } from "motion/react";

interface GeneticsTreeProps {
  genetics: string | null;
  parentMother: string | null;
  parentFather: string | null;
  childName: string;
  motherLabel: string;
  fatherLabel: string;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return name.slice(0, 2).charAt(0).toUpperCase() + name.slice(1, 2).toLowerCase();
  }
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

/* ── Connector lines ── */
function VineConnectors() {
  const vinePath1 = "M 120 0 C 120 28, 48 28, 48 56";
  const vinePath2 = "M 120 0 C 120 28, 192 28, 192 56";
  const vineLength = 120;

  return (
    <svg
      width="240"
      height="56"
      viewBox="0 0 240 56"
      className="mx-auto h-auto w-full max-w-[240px]"
      fill="none"
    >
      {/* Dotted background guides */}
      <path
        d={vinePath1}
        stroke="currentColor"
        strokeWidth="0.75"
        strokeDasharray="2 4"
        className="text-foreground/15"
      />
      <path
        d={vinePath2}
        stroke="currentColor"
        strokeWidth="0.75"
        strokeDasharray="2 4"
        className="text-foreground/15"
      />
      {/* Animated solid lines */}
      <motion.path
        d={vinePath1}
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        className="text-foreground/30"
        strokeDasharray={vineLength}
        initial={{ strokeDashoffset: vineLength }}
        whileInView={{ strokeDashoffset: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
      />
      <motion.path
        d={vinePath2}
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        className="text-foreground/30"
        strokeDasharray={vineLength}
        initial={{ strokeDashoffset: vineLength }}
        whileInView={{ strokeDashoffset: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
      />
      {/* Junction dots */}
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 1, duration: 0.4 }}
      >
        <circle cx="84" cy="36" r="1.5" className="fill-foreground/20" />
        <circle cx="156" cy="36" r="1.5" className="fill-foreground/20" />
      </motion.g>
    </svg>
  );
}

/* ── Periodic-table style element node ── */
function ElementNode({
  name,
  label,
  size,
  bgClass,
  delay,
}: {
  name: string;
  label?: string;
  size: "lg" | "sm";
  bgClass: string;
  delay: number;
}) {
  const nodeSize = size === "lg" ? "clamp(48px, 14vw, 56px)" : "clamp(40px, 12vw, 46px)";

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay }}
    >
      <div
        className={`flex items-center justify-center ${bgClass}`}
        style={{ width: nodeSize, height: nodeSize }}
      >
        <span
          className="font-display font-bold leading-none text-white"
          style={{ fontSize: size === "lg" ? 18 : 14 }}
        >
          {getInitials(name)}
        </span>
      </div>
      <span
        className={`mt-1.5 w-full text-center font-mono font-medium leading-tight line-clamp-2 break-words ${
          size === "lg" ? "max-w-[120px] text-xs" : "max-w-[100px] text-[10px]"
        }`}
      >
        {name}
      </span>
      {label && (
        <span className="mt-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-foreground/35">
          {label}
        </span>
      )}
    </motion.div>
  );
}

export function GeneticsTree({
  genetics,
  parentMother,
  parentFather,
  childName,
  motherLabel,
  fatherLabel,
}: GeneticsTreeProps) {
  const hasBothParents = parentMother && parentFather;
  const hasOneParent = parentMother || parentFather;

  if (!hasBothParents && !genetics) return null;

  if (!hasOneParent && genetics) {
    return (
      <div className="flex items-center gap-2 text-sm text-foreground/60">
        <span className="font-mono font-medium text-foreground/80">{genetics}</span>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[320px] flex-col items-center">
      {/* Child */}
      <ElementNode
        name={childName}
        size="lg"
        bgClass="bg-primary"
        delay={0}
      />

      {/* Connectors */}
      {hasBothParents && (
        <>
          <VineConnectors />

          {/* Parents */}
          <div className="flex w-full max-w-[240px] justify-between gap-3 px-1 sm:px-0">
            <div className="flex min-w-0 flex-1 justify-center">
              <ElementNode
                name={parentMother!}
                label={motherLabel}
                size="sm"
                bgClass="bg-foreground/15"
                delay={0.5}
              />
            </div>
            <div className="flex min-w-0 flex-1 justify-center">
              <ElementNode
                name={parentFather!}
                label={fatherLabel}
                size="sm"
                bgClass="bg-foreground/15"
                delay={0.7}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
