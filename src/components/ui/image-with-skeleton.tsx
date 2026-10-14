"use client";

import * as React from "react";
import Image, { type ImageProps } from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ImageWithSkeletonProps extends ImageProps {
  /** Extra classes applied to the wrapper div that hosts the skeleton overlay. */
  wrapperClassName?: string;
  /** Extra classes applied to the skeleton overlay itself. */
  skeletonClassName?: string;
}

/**
 * Drop-in replacement for `next/image` that shows a `Skeleton` placeholder
 * while the image is loading and cross-fades the image in once it's ready.
 *
 * Intentionally unopinionated about sizing: pass the same `fill`, `sizes`,
 * `priority`, `width`, `height` you would pass to `next/image`.
 */
export function ImageWithSkeleton({
  className,
  wrapperClassName,
  skeletonClassName,
  onLoad,
  onError,
  ...imageProps
}: ImageWithSkeletonProps) {
  const [loaded, setLoaded] = React.useState(false);

  return (
    <>
      {!loaded && (
        <Skeleton
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 h-full w-full rounded-none",
            skeletonClassName,
            wrapperClassName,
          )}
        />
      )}
      <Image
        {...imageProps}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
        onError={(event) => {
          // Hide the skeleton even on error so broken images don't pulse forever.
          setLoaded(true);
          onError?.(event);
        }}
        className={cn(
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </>
  );
}
