"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import { ShoppingBag } from "lucide-react";
import { type CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

function isVideo(url: string) {
  return /\.(mp4|webm|mov)($|\?)/i.test(url);
}

interface ProductGalleryProps {
  media: string[];
  alt: string;
}

export function ProductGallery({ media, alt }: ProductGalleryProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [thumbApi, setThumbApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [videoErrors, setVideoErrors] = useState<Set<number>>(new Set());
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const autoplayRef = useRef(
    Autoplay({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  const fallbackImage = media.find((url) => !isVideo(url));

  const markVideoError = useCallback((i: number) => {
    setVideoErrors((prev) => {
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  }, []);

  const onSelect = useCallback(() => {
    if (!api) return;
    const index = api.selectedScrollSnap();
    setCurrent(index);
    thumbApi?.scrollTo(index);

    videoRefs.current.forEach((video, i) => {
      if (i !== index) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    });
  }, [api, thumbApi]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  // Pause videos + carousel autoplay when the gallery scrolls off-screen
  const rootRef = useRef<HTMLDivElement>(null);
  const hasAutoplay = media.length > 1;
  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          if (hasAutoplay && api) {
            try {
              autoplayRef.current?.play?.();
            } catch {
              // Autoplay plugin may not be fully initialized yet
            }
          }
          const currentIdx = api?.selectedScrollSnap?.() ?? 0;
          videoRefs.current.forEach((video, i) => {
            if (i === currentIdx) video.play().catch(() => {});
          });
        } else {
          if (hasAutoplay && api) {
            try {
              autoplayRef.current?.stop?.();
            } catch {
              // ignore
            }
          }
          videoRefs.current.forEach((video) => video.pause());
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [api, hasAutoplay]);

  const onThumbClick = useCallback(
    (index: number) => {
      api?.scrollTo(index);
    },
    [api]
  );

  if (!media.length) {
    return (
      <div className="relative aspect-[4/5] overflow-hidden rounded-t-full bg-secondary">
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <ShoppingBag className="h-20 w-20 opacity-20" />
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="space-y-3">
      {/* Main carousel */}
      <Carousel
        setApi={setApi}
        opts={{
          loop: true,
          align: "center",
          skipSnaps: false,
        }}
        plugins={media.length > 1 ? [autoplayRef.current] : []}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {media.map((url, i) => (
            <CarouselItem key={i} className="pl-0">
              <div className="relative aspect-[4/5] overflow-hidden rounded-t-full bg-secondary">
                {isVideo(url) && !videoErrors.has(i) ? (
                  <video
                    ref={(el) => {
                      if (el) videoRefs.current.set(i, el);
                      else videoRefs.current.delete(i);
                    }}
                    src={url}
                    className="h-full w-full object-cover"
                    playsInline
                    loop
                    muted
                    autoPlay
                    preload="metadata"
                    onError={() => markVideoError(i)}
                  />
                ) : isVideo(url) && videoErrors.has(i) && fallbackImage ? (
                  <Image
                    src={fallbackImage}
                    alt={`${alt} ${i + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                ) : !isVideo(url) ? (
                  <Image
                    src={url}
                    alt={`${alt} ${i + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    priority={i === 0}
                  />
                ) : null}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Thumbnail strip */}
      {media.length > 1 && (
        <Carousel
          setApi={setThumbApi}
          opts={{
            containScroll: "keepSnaps",
            dragFree: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2">
            {media.map((url, i) => (
              <CarouselItem
                key={i}
                className="basis-auto pl-2"
              >
                <button
                  onClick={() => onThumbClick(i)}
                  className={cn(
                    "relative h-16 w-16 md:h-20 md:w-20 overflow-hidden rounded-xl border-2 transition-all",
                    current === i
                      ? "border-foreground"
                      : "border-transparent opacity-60 hover:opacity-100 hover:border-border"
                  )}
                >
                  {isVideo(url) && !videoErrors.has(i) ? (
                    <div className="relative h-full w-full bg-secondary">
                      <video
                        src={url}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    </div>
                  ) : isVideo(url) && videoErrors.has(i) && fallbackImage ? (
                    <Image
                      src={fallbackImage}
                      alt={`${alt} thumbnail ${i + 1}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : !isVideo(url) ? (
                    <Image
                      src={url}
                      alt={`${alt} thumbnail ${i + 1}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : null}
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      )}

    </div>
  );
}
