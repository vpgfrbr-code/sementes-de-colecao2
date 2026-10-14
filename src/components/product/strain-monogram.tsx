"use client";

import { motion } from "motion/react";

interface StrainMonogramProps {
  name: string;
  seedType: string | null;
  thcMax: number | null;
  cbdMax: number | null;
  dominantTerpene?: {
    name: string;
    aroma: string;
    color: string;
  } | null;
  specimenNo?: string;
}

// Words that are connectors or modifiers, not the chemical identity of the strain.
const CONNECTOR_RE = /^(x|&|og|auto|fem|reg|#\d*|\d+)$/i;

function getInitials(name: string): string {
  const words = name.trim().split(/[\s\-–—_/]+/).filter(Boolean);
  // Find first word that carries botanical/chemical meaning (≥2 letters, not a connector)
  const meaningful = words.find(
    (w) => /[A-Za-z][A-Za-z0-9]/.test(w) && !CONNECTOR_RE.test(w)
  ) ?? words.find((w) => /[A-Za-z]/.test(w)) ?? words[0] ?? name;
  const chars = meaningful.replace(/[^A-Za-z0-9]/g, "");
  if (chars.length >= 2) {
    return chars[0]!.toUpperCase() + chars[1]!.toLowerCase();
  }
  return chars.toUpperCase().padEnd(2, chars).slice(0, 2);
}

function getSeedTypeBg(seedType: string | null): string {
  switch (seedType) {
    case "feminized":
      return "bg-primary";
    case "autoflower":
      return "bg-bark";
    case "regular":
      return "bg-foreground/80";
    default:
      return "bg-primary";
  }
}

function getSeedTypeAbbr(seedType: string | null) {
  switch (seedType) {
    case "feminized": return "FEM.";
    case "autoflower": return "AUTO.";
    case "regular": return "REG.";
    default: return "";
  }
}

export function StrainMonogram({
  name,
  seedType,
  thcMax,
  cbdMax,
  dominantTerpene,
  specimenNo,
}: StrainMonogramProps) {
  const initials = getInitials(name);
  const seedAbbr = getSeedTypeAbbr(seedType);
  const bgClass = getSeedTypeBg(seedType);

  const thcCbd =
    thcMax !== null && cbdMax !== null && cbdMax > 0
      ? `THC ${thcMax}% · CBD ${cbdMax}%`
      : thcMax !== null
        ? `THC ${thcMax}%`
        : cbdMax !== null && cbdMax > 0
          ? `CBD ${cbdMax}%`
          : null;

  return (
    <div className="flex flex-col items-center gap-3 sm:items-start">
      {/* ── Periodic Table Element ── */}
      <motion.div
        className={`${bgClass} relative flex w-[148px] shrink-0 flex-col items-center px-3 pb-3 pt-2.5 text-white`}
        initial={{ opacity: 0, scale: 0.92 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Top row: specimen no. + seed type */}
        <div className="flex w-full items-start justify-between">
          {specimenNo && (
            <span className="font-mono text-[7px] font-bold uppercase leading-none tracking-[0.1em] text-white/50">
              {specimenNo}
            </span>
          )}
          {seedAbbr && (
            <span className="font-mono text-[7px] font-bold uppercase leading-none tracking-[0.1em] text-white/50">
              {seedAbbr}
            </span>
          )}
        </div>

        {/* Center: large initials */}
        <span className="mt-2 font-display text-4xl font-bold leading-none tracking-tight">
          {initials}
        </span>

        {/* THC / CBD (like atomic mass) */}
        {thcCbd && (
          <span className="mt-1.5 font-mono text-[11px] font-medium leading-none tracking-tight text-white/70">
            {thcCbd}
          </span>
        )}

        {/* Product name */}
        <span className="mt-2.5 line-clamp-2 max-w-full text-center font-mono text-[9px] font-semibold uppercase leading-tight tracking-[0.1em] text-white/60">
          {name}
        </span>
      </motion.div>

      {/* ── Dominant Terpene — bordered sub-cell ── */}
      {dominantTerpene && (
        <div className="flex flex-col gap-1.5 border border-foreground/10 px-3 py-2">
          <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-foreground/40">
            Dominant terpene
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold">
            <span
              className="shrink-0 size-2.5 rounded-full"
              style={{
                backgroundColor: dominantTerpene.color,
                boxShadow: `0 0 0 2px var(--color-card), 0 0 0 3px ${dominantTerpene.color}40`,
              }}
            />
            {dominantTerpene.name}
          </span>
        </div>
      )}
    </div>
  );
}
