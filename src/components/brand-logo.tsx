"use client";

import Image from "next/image";
import { useState } from "react";
import {
  BRANDING_FALLBACKS,
  type BrandingSettings,
} from "@/lib/branding";
import { useBrandingOptional } from "@/lib/branding-context";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  variant?: "primary" | "inverse";
  width: number;
  height: number;
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  priority?: boolean;
  /**
   * When true, the component renders nothing in text mode. Use for purely
   * decorative usages like the BrandHero watermark — replacing a giant
   * background image with giant text would not make visual sense.
   */
  decorative?: boolean;
  /**
   * Server-side override. Pass `await getBrandingSettings()` from a server
   * component to avoid relying on the BrandingProvider context (e.g. inside
   * the SiteFooter, which is itself a server component).
   */
  settings?: BrandingSettings;
}

/**
 * Renders the brand identity. In "image" mode it shows the configured logo
 * (with `variant="inverse"` for dark backgrounds); in "text" mode it shows
 * the brand name in the display font. If the configured asset URL fails to
 * load, falls back to the bundled SVGs in /public.
 */
export function BrandLogo({
  variant = "primary",
  width,
  height,
  className,
  imageClassName,
  textClassName,
  priority,
  decorative,
  settings,
}: BrandLogoProps) {
  const ctx = useBrandingOptional();
  const s = settings ?? ctx;
  const [errored, setErrored] = useState(false);

  if (!s) return null;

  if (s.mode === "text") {
    if (decorative) return null;
    return (
      <span
        className={cn(
          "font-display font-bold tracking-tight leading-none",
          className,
          textClassName
        )}
        aria-label={s.brandName}
      >
        {s.brandName}
      </span>
    );
  }

  const configured =
    variant === "inverse" ? s.logoInverseUrl : s.logoUrl;
  const fallback =
    variant === "inverse"
      ? BRANDING_FALLBACKS.logoInverseUrl
      : BRANDING_FALLBACKS.logoUrl;
  const src = errored ? fallback : configured;

  return (
    <Image
      src={src}
      alt={s.brandName}
      width={width}
      height={height}
      priority={priority}
      onError={() => setErrored(true)}
      className={cn(className, imageClassName)}
    />
  );
}
