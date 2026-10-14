"use client";

import { FlavorIcon, FLAVOR_LABELS, type FlavorSlug } from "./flavor-icons";

interface FlavorProfileProps {
  flavors: string[];
  label?: string;
  /** Show max N flavors (0 = all). Default: 0 */
  max?: number;
  /** Compact mode for inline display in cards */
  compact?: boolean;
}

export function FlavorProfile({
  flavors,
  label,
  max = 0,
  compact = false,
}: FlavorProfileProps) {
  if (!flavors || flavors.length === 0) return null;

  const items = max > 0 ? flavors.slice(0, max) : flavors;
  const remaining = max > 0 && flavors.length > max ? flavors.length - max : 0;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {items.map((slug) => (
          <span
            key={slug}
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-foreground/50"
          >
            <FlavorIcon slug={slug} className="h-3 w-3" />
            <span className="font-bold text-foreground">
              {FLAVOR_LABELS[slug as FlavorSlug] ?? slug}
            </span>
          </span>
        ))}
        {remaining > 0 && (
          <span className="font-mono text-[10px] text-foreground/40">
            +{remaining}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {label && (
        <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-foreground/80">
          {label}
        </h3>
      )}
      <div className="flex flex-wrap gap-2">
        {items.map((slug) => (
          <span
            key={slug}
            className="inline-flex items-center gap-1.5 border border-foreground/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/70 transition-colors hover:border-foreground/30 hover:text-foreground/90"
          >
            <FlavorIcon slug={slug} className="h-3.5 w-3.5" />
            {FLAVOR_LABELS[slug as FlavorSlug] ?? slug}
          </span>
        ))}
        {remaining > 0 && (
          <span className="inline-flex items-center border border-foreground/10 px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] text-foreground/40">
            +{remaining}
          </span>
        )}
      </div>
    </div>
  );
}
