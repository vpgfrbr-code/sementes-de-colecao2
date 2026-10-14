"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface TerpeneEntry {
  is_dominant: boolean;
  terpenes: {
    id: string;
    slug: string;
    name: string;
    aroma: string;
    color: string;
  };
}

interface TerpeneProfileProps {
  entries: TerpeneEntry[];
  animKey?: number;
  compact?: boolean;
}

export function TerpeneProfile({ entries, animKey = 0, compact = false }: TerpeneProfileProps) {
  const pt = useTranslations("product");

  if (!entries.length) return null;

  const sorted = [...entries].sort((a, b) => {
    if (a.is_dominant && !b.is_dominant) return -1;
    if (!a.is_dominant && b.is_dominant) return 1;
    return 0;
  });

  return (
    <div>
      <h2 className={cn("font-display text-xs font-bold uppercase tracking-[0.2em] text-foreground/50", compact ? "mb-3" : "mb-4")}>
        {pt("terpeneProfile")}
      </h2>
      <div className={cn("grid gap-0", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
        {sorted.map((entry, i) => {
          const terpKey = entry.terpenes.slug;
          const translatedName = pt.has(`terpenes.${terpKey}.name`)
            ? pt(`terpenes.${terpKey}.name` as never)
            : entry.terpenes.name;
          const translatedAroma = pt.has(`terpenes.${terpKey}.aroma`)
            ? pt(`terpenes.${terpKey}.aroma` as never)
            : entry.terpenes.aroma;

          return (
            <TerpeneCard
              key={entry.terpenes.id}
              name={translatedName}
              aroma={translatedAroma}
              color={entry.terpenes.color}
              isDominant={entry.is_dominant}
              barWidth={entry.is_dominant ? 100 : 55 + (sorted.length - i) * 5}
              dominantLabel={pt("dominant")}
              delay={i * 0.1}
              animKey={animKey}
            />
          );
        })}
      </div>
    </div>
  );
}

function TerpeneCard({
  name,
  aroma,
  color,
  isDominant,
  barWidth,
  dominantLabel,
  delay,
  animKey,
}: {
  name: string;
  aroma: string;
  color: string;
  isDominant: boolean;
  barWidth: number;
  dominantLabel: string;
  delay: number;
  animKey?: number;
}) {
  return (
    <motion.div
      className={`group relative overflow-hidden border-b border-r border-foreground/10 p-4 transition-colors hover:bg-foreground/[0.02] ${
        isDominant ? "bg-foreground/[0.02]" : ""
      }`}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: isDominant ? color : "transparent",
        borderLeftStyle: "solid",
      }}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay }}
    >
      <div className="flex items-start gap-3">
        {/* Terpene color indicator */}
        <div className="relative mt-0.5 shrink-0">
          <div
            className="size-4 rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-sm font-bold leading-tight min-w-0 break-words">
              {name}
            </span>
            {isDominant && (
              <span
                className="shrink-0 inline-block text-[8px] font-mono font-bold uppercase tracking-[0.15em] border px-1.5 py-0.5 -rotate-2"
                style={{
                  color,
                  borderColor: `${color}60`,
                }}
              >
                {dominantLabel}
              </span>
            )}
          </div>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-foreground/50 font-mono">
            {aroma}
          </span>

          {/* Bar chart with tick marks — re-animates on card hover via animKey */}
          <div className="relative mt-2.5">
            <div className="h-1.5 w-full overflow-hidden bg-foreground/5">
              <motion.div
                key={`bar-${color}-${animKey ?? 0}`}
                className="h-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${Math.min(barWidth, 100)}%` }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1],
                  delay: delay + 0.2,
                }}
              />
            </div>
            {/* Tick marks */}
            <div className="absolute top-0 left-0 w-full h-1.5 flex justify-between pointer-events-none">
              {[0, 25, 50, 75, 100].map((tick) => (
                <div key={tick} className="w-px h-full bg-foreground/8" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
