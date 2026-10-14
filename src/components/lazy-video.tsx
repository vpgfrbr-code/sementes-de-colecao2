"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface LazyVideoProps
  extends Omit<React.VideoHTMLAttributes<HTMLVideoElement>, "src"> {
  /** Primary video URL. If it points to `/videos/*.mp4`, the component will
   *  automatically prefer the pre-encoded `/videos/optimized/<name>.{webm,mp4}`
   *  variants (desktop + mobile tiers) and derive a matching poster. */
  src?: string;
  /** Explicit list of `<source>` entries. Overrides auto-derivation. */
  sources?: { src: string; type: string; media?: string }[];
  /** Distance in px before the viewport at which the video starts loading */
  rootMargin?: string;
  /** Max viewport width (px) that should receive the mobile-tier variant.
   *  Defaults to 640, matching the output from `pnpm optimize:videos`. */
  mobileBreakpoint?: number;
}

/**
 * Derives optimized <source> entries and a poster from a local /videos/ URL.
 * External URLs (e.g. Supabase Storage) pass through unchanged.
 *
 * Emits the mobile tier first with a `media="(max-width: Xpx)"` attribute so
 * phones download ≤640px-wide files, while laptops/desktops get the 1280px
 * tier. Within each tier WebM is listed before MP4 as a codec preference.
 */
function deriveOptimized(
  src: string | undefined,
  mobileBreakpoint: number
): {
  sources: { src: string; type: string; media?: string }[];
  poster: string | undefined;
} {
  if (!src) return { sources: [], poster: undefined };

  const match = /^\/videos\/(?!optimized\/)([^/?#]+)\.(mp4|mov|webm|m4v)(\?|#|$)/i.exec(src);
  if (!match) {
    const ext = src.split(".").pop()?.toLowerCase();
    const type = ext === "webm" ? "video/webm" : ext === "mov" ? "video/quicktime" : "video/mp4";
    return { sources: [{ src, type }], poster: undefined };
  }

  const name = match[1];
  const media = `(max-width: ${mobileBreakpoint}px)`;
  return {
    sources: [
      // Mobile tier — only picked when viewport is ≤ breakpoint.
      { src: `/videos/optimized/${name}.sm.webm`, type: "video/webm", media },
      { src: `/videos/optimized/${name}.sm.mp4`, type: "video/mp4", media },
      // Desktop/laptop tier — default for everything wider.
      { src: `/videos/optimized/${name}.webm`, type: "video/webm" },
      { src: `/videos/optimized/${name}.mp4`, type: "video/mp4" },
    ],
    poster: `/videos/optimized/${name}.jpg`,
  };
}

/**
 * LazyVideo — only renders the <video> element when it enters
 * (or is near) the viewport via IntersectionObserver.
 *
 * When given a `src` pointing to `/videos/*.mp4`, it automatically serves:
 *   - mobile WebM/MP4 (≤640px wide) on phones
 *   - desktop/laptop WebM/MP4 (≤1280px wide) on larger viewports
 *   - H.264 fallback for browsers that can't play VP9
 *
 * All variants are produced by `pnpm optimize:videos`. A poster frame is
 * auto-derived and shown while the video is off-screen or still buffering —
 * this keeps LCP low on product landings.
 */
export function LazyVideo({
  rootMargin = "200px",
  className,
  poster,
  preload = "metadata",
  src,
  sources,
  mobileBreakpoint = 640,
  ...props
}: LazyVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const derived = useMemo(
    () => deriveOptimized(src, mobileBreakpoint),
    [src, mobileBreakpoint]
  );
  const finalSources = sources && sources.length > 0 ? sources : derived.sources;
  const finalPoster = poster ?? derived.poster;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={containerRef} className={className}>
      {isVisible ? (
        <video
          className="h-full w-full object-cover"
          poster={finalPoster}
          preload={preload}
          {...props}
        >
          {finalSources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} media={s.media} />
          ))}
        </video>
      ) : finalPoster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={finalPoster}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="h-full w-full" />
      )}
    </div>
  );
}
