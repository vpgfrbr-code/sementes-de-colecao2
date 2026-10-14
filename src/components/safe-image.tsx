"use client";

import Image, { type ImageProps } from "next/image";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";

/**
 * Normalizes a (possibly stale) image URL captured in cart/order snapshots:
 * - Encodes literal spaces in local paths (legacy folder names like
 *   `/images/forbidden orange/...`).
 * - Rewrites known video extensions (`.mp4|.webm|.mov`) to a `.jpg` sibling,
 *   which works for hosted video thumbnails and for local posters named
 *   with a matching `.jpg`.
 * - Returns `null` for falsy/whitespace-only inputs so callers can render a
 *   placeholder instead of passing an invalid `src` to `next/image`.
 */
export function normalizeImageSrc(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const videoSwapped = trimmed.replace(/\.(mp4|webm|mov)($|\?)/i, ".jpg$2");
  // Encode spaces for local paths; leave already-encoded URLs untouched.
  if (videoSwapped.startsWith("/") && videoSwapped.includes(" ")) {
    return videoSwapped.replace(/ /g, "%20");
  }
  return videoSwapped;
}

type SafeImageProps = Omit<ImageProps, "src" | "onError"> & {
  src: string | null | undefined;
  /** Rendered when src is missing or the image fails to load. */
  fallback?: React.ReactNode;
};

/**
 * `next/image` wrapper that swaps to a fallback node on load error or when
 * the src is empty / a video URL. Use in places that render user-captured
 * snapshots (cart items, order items) where stale URLs are common.
 */
export function SafeImage({ src, fallback, alt, ...rest }: SafeImageProps) {
  const normalized = normalizeImageSrc(src);
  const [errored, setErrored] = useState(false);

  if (!normalized || errored) {
    return (
      <>
        {fallback ?? (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <ShoppingBag className="h-6 w-6 text-foreground/20" />
          </div>
        )}
      </>
    );
  }

  return (
    <Image
      {...rest}
      src={normalized}
      alt={alt}
      onError={() => setErrored(true)}
    />
  );
}
