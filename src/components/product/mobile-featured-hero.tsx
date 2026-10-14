"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { HeaderThemeSentinel } from "@/components/header-theme-sentinel";
import { TitleOverlay } from "@/components/product/video-scrub-hero";

interface MobileFeaturedHeroProps {
  /** Poster image used as the hero background. */
  posterSrc: string;
  /** Product name shown as the main heading. */
  productName: string;
  /** Small caps line above the title (e.g. category). */
  eyebrow?: string | null;
  /** Label shown below the chevron. Defaults to "Role". */
  scrollLabel?: string;
}

/**
 * Mobile-only hero for featured products. Does NOT use scroll scrubbing or
 * preload frame images: it renders a single poster with a subtle Ken Burns
 * zoom (respecting prefers-reduced-motion) so scrolling stays native and
 * responsive on low-end devices and iOS Safari (URL bar jitter avoided via
 * svh units).
 */
export function MobileFeaturedHero({
  posterSrc,
  productName,
  eyebrow,
  scrollLabel = "Role",
}: MobileFeaturedHeroProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative w-full overflow-hidden min-h-[88svh] max-h-[100svh] aspect-[3/4] md:hidden">
      {/* Keep global header dark while hero is in view */}
      <HeaderThemeSentinel />

      {/* Ken Burns wrapper (full-bleed) */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1 }}
        animate={prefersReducedMotion ? { scale: 1 } : { scale: [1, 1.05, 1] }}
        transition={
          prefersReducedMotion
            ? undefined
            : { duration: 20, ease: "easeInOut", repeat: Infinity }
        }
      >
        <Image
          src={posterSrc}
          alt={productName}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>

      {/* Top gradient to blend with the dark global header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 z-10 bg-gradient-to-b from-black/50 via-black/20 to-transparent dark:from-black/70 dark:via-black/30 mix-blend-multiply" />

      {/* Bottom gradient for legibility */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Title overlay — bottom left */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-24">
        <TitleOverlay
          productName={productName}
          eyebrow={eyebrow}
          eyebrowClassName="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-white/55"
          titleClassName="font-display text-4xl font-bold leading-none tracking-tight text-white drop-shadow-lg"
        />
      </div>

      {/* Persistent scroll affordance — center bottom */}
      <motion.div
        className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5"
        animate={prefersReducedMotion ? undefined : { y: [0, 6, 0] }}
        transition={
          prefersReducedMotion
            ? undefined
            : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/70">
          {scrollLabel}
        </span>
        <ChevronDown className="h-4 w-4 text-white/70" strokeWidth={1.5} />
      </motion.div>
    </section>
  );
}
