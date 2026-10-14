"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { HeaderThemeSentinel } from "@/components/header-theme-sentinel";

interface VideoScrubHeroProps {
  /** Array of frame image URLs in order, e.g. ["/images/frames/frame_0001.jpg", ...] */
  frames: string[];
  /**
   * Optional parallel array of low-resolution frame URLs (same length/order as `frames`).
   * When provided, these tiny images preload in parallel and become the scrub source
   * until the high-res version for each index finishes loading. Lets the hero become
   * interactive in a fraction of the time. Generate with `scripts/generate-frames-lq.ts`.
   */
  lowResFrames?: string[];
  /** Static poster shown while frames load */
  posterSrc?: string;
  /** Total scrollable height on desktop, e.g. "400vh" */
  scrollHeight?: string;
  /** Total scrollable height on mobile (<768px), e.g. "250vh" */
  mobileScrollHeight?: string;
  /** Scroll progress (0-1) where the dark overlay starts fading in */
  overlayStart?: number;
  /** Product name displayed as overlay at the bottom of the hero */
  productName?: string;
  /** Small caps line above the title (e.g. category); avoids repeating the seed bank when it appears again below */
  eyebrow?: string | null;
}

export function VideoScrubHero({
  frames,
  lowResFrames,
  posterSrc,
  scrollHeight = "400vh",
  mobileScrollHeight = "250vh",
  overlayStart = 0.65,
  productName,
  eyebrow,
}: VideoScrubHeroProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [stickyHeight, setStickyHeight] = useState(0);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const lowResImagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const currentFrameRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const [loadProgress, setLoadProgress] = useState(0);
  const [lowResReady, setLowResReady] = useState(false);
  const isLoaded = loadProgress >= 1;
  // We can hide the poster and show the canvas as soon as EITHER the low-res
  // tier is fully loaded OR the high-res tier finished.
  const isScrubbable = isLoaded || lowResReady;

  const frameCount = frames.length;

  // --- Scroll tracking ---
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Dark overlay opacity
  const overlayOpacity = useTransform(scrollYProgress, [overlayStart, 1], [0, 0.7]);

  // Scroll indicator opacity (fades out immediately)
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.05], [1, 0]);
  const mobileWhiteBlockFadeEnd = 0.08;
  const mobileTitleTransitionStart = 0.1;
  const mobileTitleTransitionEnd = 0.22;
  const mobileFloatingTitleY = useTransform(
    scrollYProgress,
    [0, mobileTitleTransitionStart, mobileTitleTransitionEnd],
    [0, 0, -48]
  );
  const mobileFloatingBlockOpacity = useTransform(
    scrollYProgress,
    [0, mobileWhiteBlockFadeEnd],
    [1, 0]
  );
  const mobileFloatingTitleOpacity = useTransform(
    scrollYProgress,
    [0, mobileTitleTransitionStart, mobileTitleTransitionEnd],
    [1, 1, 0]
  );
  const mobileHeroTitleOpacity = useTransform(
    scrollYProgress,
    [mobileTitleTransitionStart, mobileTitleTransitionEnd],
    [0, 1]
  );

  // --- Draw a specific frame to canvas (cover-fit) ---
  const drawFrame = useCallback(
    (frameIndex: number) => {
      const canvas = canvasRef.current;
      // Prefer high-res; fall back to low-res tier if HQ not loaded yet.
      const hq = imagesRef.current[frameIndex];
      const lq = lowResImagesRef.current[frameIndex];
      const img =
        hq && hq.complete && hq.naturalWidth
          ? hq
          : lq && lq.complete && lq.naturalWidth
            ? lq
            : null;
      if (!canvas || !img) return;

      if (!ctxRef.current) {
        ctxRef.current = canvas.getContext("2d");
      }
      const ctx = ctxRef.current;
      if (!ctx) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;

      // object-fit: cover
      const canvasRatio = cw / ch;
      const imgRatio = iw / ih;

      let sx: number, sy: number, sw: number, sh: number;
      if (imgRatio > canvasRatio) {
        sh = ih;
        sw = ih * canvasRatio;
        sx = (iw - sw) / 2;
        sy = 0;
      } else {
        sw = iw;
        sh = iw / canvasRatio;
        sx = 0;
        sy = (ih - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
    },
    []
  );

  // --- Resize canvas ---
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const sticky = stickyRef.current;
    if (!canvas || !sticky) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = sticky.offsetWidth;
    const h = sticky.offsetHeight;
    setStickyHeight((prev) => (prev !== h ? h : prev));

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctxRef.current = null;
    drawFrame(currentFrameRef.current);
  }, [drawFrame]);

  // --- Preload low-res tier (parallel, highest priority) ---
  useEffect(() => {
    if (!lowResFrames || lowResFrames.length === 0) return;
    // Guard: only use LQ tier if it matches the HQ frame count 1:1.
    if (lowResFrames.length !== frameCount) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[VideoScrubHero] lowResFrames length (${lowResFrames.length}) does not match frames length (${frameCount}); ignoring LQ tier.`
        );
      }
      return;
    }

    const slots = new Array<HTMLImageElement | null>(frameCount).fill(null);
    lowResImagesRef.current = slots;
    let loaded = 0;
    let cancelled = false;

    lowResFrames.forEach((src, index) => {
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        slots[index] = img;
        loaded++;
        // Draw first frame immediately for instant visual feedback.
        if (index === 0 && !imagesRef.current[0] && canvasRef.current) {
          drawFrame(0);
        }
        if (loaded === frameCount) setLowResReady(true);
      };
      img.onerror = () => {
        if (cancelled) return;
        loaded++;
        if (loaded === frameCount) setLowResReady(true);
      };
      img.src = src;
    });

    return () => {
      cancelled = true;
    };
  }, [lowResFrames, frameCount, drawFrame]);

  // --- Preload all frame images ---
  useEffect(() => {
    if (frameCount === 0) return;

    let loadedCount = 0;
    const imageSlots = new Array<HTMLImageElement | null>(frameCount).fill(null);
    imagesRef.current = imageSlots; // expose immediately so scroll handler can read progressive frames

    const loadImage = (index: number): Promise<void> =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          imageSlots[index] = img;
          loadedCount++;
          setLoadProgress(loadedCount / frameCount);

          // Re-draw current frame if we just upgraded it from LQ to HQ.
          if (index === currentFrameRef.current && canvasRef.current) {
            drawFrame(index);
          } else if (index === 0 && canvasRef.current) {
            drawFrame(0);
          }

          resolve();
        };
        img.onerror = () => {
          loadedCount++;
          setLoadProgress(loadedCount / frameCount);
          resolve();
        };
        img.src = frames[index]!;
      });

    async function loadAll() {
      // Phase 1: first 10 frames for immediate interactivity
      const firstBatch = Math.min(10, frameCount);
      const firstPromises: Promise<void>[] = [];
      for (let i = 0; i < firstBatch; i++) {
        firstPromises.push(loadImage(i));
      }
      await Promise.all(firstPromises);

      // Phase 2: remaining frames in parallel batches of 6
      const batchSize = 6;
      for (let i = firstBatch; i < frameCount; i += batchSize) {
        const batch: Promise<void>[] = [];
        for (let j = i; j < Math.min(i + batchSize, frameCount); j++) {
          batch.push(loadImage(j));
        }
        await Promise.all(batch);
      }
    }

    loadAll();
  }, [frames, frameCount, drawFrame]);

  // --- Resize listener ---
  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // --- Sync scroll → frame index ---
  useEffect(() => {
    if (frameCount === 0) return;

    const unsubscribe = scrollYProgress.on("change", (progress) => {
      const targetFrame = Math.max(
        0,
        Math.min(
          Math.floor(progress * (frameCount - 1)),
          frameCount - 1
        )
      );

      if (targetFrame === currentFrameRef.current) return;
      currentFrameRef.current = targetFrame;

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        drawFrame(targetFrame);
      });
    });

    return () => {
      unsubscribe();
      cancelAnimationFrame(rafRef.current);
    };
  }, [scrollYProgress, frameCount, drawFrame]);

  // Scroll progress for ring indicator
  const progressForRing = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      ref={containerRef}
      style={{ height: isMobile ? mobileScrollHeight : scrollHeight }}
      className="relative"
    >
      {/* Sentinel covers the full 400vh container so the header stays dark
          for the entire scroll journey, not just the first pixel */}
      <HeaderThemeSentinel />
      <div ref={stickyRef} className="sticky top-0 w-full overflow-hidden aspect-[4/5] md:aspect-auto md:h-dvh">
        {/* Loading poster — hidden as soon as the LQ tier is scrubbable. */}
        {!isScrubbable && posterSrc && (
          <img
            src={posterSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* Loading progress bar tracks the HIGH-RES tier specifically. */}
        {!isLoaded && (
          <div className="absolute bottom-0 left-0 right-0 z-10 h-0.5 bg-white/10">
            <div
              className="h-full bg-white/50 transition-[width] duration-300"
              style={{ width: `${loadProgress * 100}%` }}
            />
          </div>
        )}

        {/* Canvas for frames */}
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {/* Permanent bottom gradient for legibility */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Gradient superior para proteger e mesclar suavemente com o header global */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 via-black/20 to-transparent dark:from-black/70 dark:via-black/30 mix-blend-multiply z-10" />

        {/* Dark scroll overlay */}
        <motion.div
          style={{ opacity: overlayOpacity }}
          className="absolute inset-0 bg-black pointer-events-none"
        />

        {/* Product name overlay — bottom left */}
        {productName && (
          <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-24 md:pb-16">
            <motion.div style={{ opacity: isMobile ? mobileHeroTitleOpacity : 1 }}>
              <TitleOverlay
                productName={productName}
                eyebrow={eyebrow}
                eyebrowClassName="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-white/55"
                titleClassName="font-display text-4xl font-bold leading-none tracking-tight text-white drop-shadow-lg md:text-6xl"
              />
            </motion.div>
          </div>
        )}

        {/* Scroll progress ring — bottom right */}
        <motion.div
          style={{ opacity: scrollIndicatorOpacity }}
          className="absolute bottom-8 right-6 pointer-events-none z-20"
        >
          <ScrollProgressRing progress={progressForRing} />
        </motion.div>

        {/* Frame counter — bottom left (only when no product name) */}
        {!productName && (
          <motion.div
            style={{ opacity: scrollIndicatorOpacity }}
            className="absolute bottom-8 left-8 pointer-events-none"
          >
            <FrameCounter current={currentFrameRef.current} total={frameCount} progress={scrollYProgress} />
          </motion.div>
        )}

        {/* Scroll indicator — center bottom */}
        <motion.div
          style={{ opacity: scrollIndicatorOpacity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-20"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/60">
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="h-8 w-px bg-white/40"
          />
        </motion.div>
      </div>

      {/* Mobile floating title: starts in white area, then merges into hero */}
      {isMobile && productName && stickyHeight > 0 && (
        <motion.div
          style={{
            top: stickyHeight + 64,
            y: mobileFloatingTitleY,
            opacity: mobileFloatingTitleOpacity,
          }}
          className="pointer-events-none absolute left-0 right-0 z-30 px-6 md:hidden"
        >
          <motion.div
            style={{ opacity: mobileFloatingBlockOpacity }}
            className="rounded-sm bg-background/92 px-4 py-3 shadow-[0_12px_30px_-16px_rgba(0,0,0,0.65)] backdrop-blur-[1px]"
          >
            <TitleOverlay
              productName={productName}
              eyebrow={eyebrow}
              eyebrowClassName="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-foreground/55"
              titleClassName="font-display text-4xl font-bold leading-none tracking-tight text-foreground"
            />
          </motion.div>
        </motion.div>
      )}
    </section>
  );
}

export function TitleOverlay({
  productName,
  eyebrow,
  eyebrowClassName,
  titleClassName,
}: {
  productName: string;
  eyebrow?: string | null;
  eyebrowClassName: string;
  titleClassName: string;
}) {
  return (
    <>
      {eyebrow && <p className={eyebrowClassName}>{eyebrow}</p>}
      <h1 className={titleClassName}>{productName}</h1>
    </>
  );
}

// ─── Scroll Progress Ring ───

function ScrollProgressRing({ progress }: { progress: ReturnType<typeof useTransform<number, number>> }) {
  const r = 16;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = useTransform(progress, (p) => circumference * (1 - p));

  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="rotate-[-90deg]">
      <circle cx="20" cy="20" r={r} fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="1.5" />
      <motion.circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke="white"
        strokeOpacity="0.5"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        style={{ strokeDashoffset }}
      />
    </svg>
  );
}

// ─── Frame Counter ───

function FrameCounter({
  current,
  total,
  progress,
}: {
  current: number;
  total: number;
  progress: ReturnType<typeof useTransform<number, number>>;
}) {
  const [displayFrame, setDisplayFrame] = useState(1);

  useEffect(() => {
    const unsubscribe = progress.on("change", (p) => {
      const frame = Math.max(1, Math.min(Math.floor(p * (total - 1)) + 1, total));
      setDisplayFrame(frame);
    });
    return unsubscribe;
  }, [progress, total]);

  return (
    <span className="font-mono text-[10px] tabular-nums tracking-[0.15em] text-white/40">
      {String(displayFrame).padStart(3, "0")} / {String(total).padStart(3, "0")}
    </span>
  );
}

/**
 * Generate an array of frame paths given a pattern.
 * Example: generateFramePaths("/images/maracuruja/frames/frame_", 97, ".jpg")
 * → ["/images/maracuruja/frames/frame_0001.jpg", ..., "/images/maracuruja/frames/frame_0097.jpg"]
 */
export function generateFramePaths(
  prefix: string,
  count: number,
  extension: string
): string[] {
  return Array.from({ length: count }, (_, i) => {
    const num = String(i + 1).padStart(4, "0");
    return `${prefix}${num}${extension}`;
  });
}
