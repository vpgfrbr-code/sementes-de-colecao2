"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImageWithSkeleton } from "@/components/ui/image-with-skeleton";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
import { TextAnimate } from "@/components/ui/text-animate";
import { HeaderThemeSentinel } from "@/components/header-theme-sentinel";

/** Prepend locale to relative links that don't already have one */
function localizeHref(href: string, locale: string): string {
  if (!href || href.startsWith("http") || href.startsWith("//")) return href;
  if (/^\/(?:pt|en|es)\//.test(href)) return href;
  return `/${locale}${href.startsWith("/") ? "" : "/"}${href}`;
}

interface Banner {
  id: string;
  image_url: string;
  image_url_mobile: string | null;
  media_type: string;
  link: string;
  hero_banner_translations: {
    title: string;
    subtitle: string;
  }[];
}

interface HeroBannerProps {
  banners: Banner[];
}

export function HeroBanner({ banners }: HeroBannerProps) {
  const locale = useLocale();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  if (!banners.length) return null;

  const single = banners.length === 1;

  return (
    <section className="relative w-full">
      <HeaderThemeSentinel />
      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "center" }}
        plugins={single ? [] : [Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })]}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {banners.map((banner, index) => {
            const translation = banner.hero_banner_translations[0];
            const isFirst = index === 0;

            return (
              <CarouselItem key={banner.id} className="pl-0">
                {banner.link ? (
                  <Link
                    href={localizeHref(banner.link, locale)}
                    className="relative block w-full overflow-hidden"
                  >
                    <BannerSlide banner={banner} translation={translation} isFirst={isFirst} />
                  </Link>
                ) : (
                  <div className="relative block w-full overflow-hidden">
                    <BannerSlide banner={banner} translation={translation} isFirst={isFirst} />
                  </div>
                )}
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {/* Dot indicators */}
      {!single && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                current === i
                  ? "w-6 bg-primary-foreground"
                  : "w-1.5 bg-primary-foreground/50 hover:bg-primary-foreground/70"
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov)($|\?)/i.test(url);
}

function BannerSlide({
  banner,
  translation,
  isFirst,
}: {
  banner: Banner;
  translation?: { title: string; subtitle: string };
  isFirst: boolean;
}) {
  const hasText = translation?.title || translation?.subtitle;
  const isVideoMedia = banner.media_type === "video" || isVideo(banner.image_url);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isVideoMedia || videoError) return;
    const el = videoRef.current;
    if (!el) return;

    const tryPlay = () => {
      if (el.paused) {
        el.play().catch(() => {});
      }
    };

    // Force autoplay via JS (handles Instagram WebView & other in-app browsers)
    tryPlay();
    el.addEventListener("canplay", tryPlay);
    return () => el.removeEventListener("canplay", tryPlay);
  }, [isVideoMedia, videoError]);

  // Use image_url_mobile as poster for video banners (shows frame immediately)
  const posterUrl = isVideoMedia
    ? banner.image_url_mobile || banner.image_url
    : undefined;

  // Videos use 16/9 on desktop (their native ratio) so the full frame is visible.
  // Static images can still be ultrawide (21/9) on lg+.
  const aspectClass = isVideoMedia
    ? "aspect-[4/5] md:aspect-[16/9]"
    : "aspect-[4/5] md:aspect-[16/9] lg:aspect-[21/9]";

  return (
    <div className={cn("relative w-full", aspectClass)}>
      {isVideoMedia && !videoError ? (
        <video
          ref={videoRef}
          src={banner.image_url}
          poster={posterUrl}
          autoPlay
          muted
          loop
          playsInline
          controls={false}
          preload="metadata"
          onError={() => setVideoError(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : banner.image_url_mobile ? (
        <>
          {/* Mobile image (hidden on md+) */}
          <ImageWithSkeleton
            src={banner.image_url_mobile}
            alt={translation?.title || "Banner"}
            fill
            sizes="(max-width: 768px) 100vw, 0px"
            className="object-cover md:hidden"
            priority={isFirst}
            fetchPriority={isFirst ? "high" : "auto"}
            loading={isFirst ? "eager" : "lazy"}
          />
          {/* Desktop image (hidden below md) */}
          <ImageWithSkeleton
            src={banner.image_url}
            alt={translation?.title || "Banner"}
            fill
            sizes="(max-width: 768px) 0px, 100vw"
            className="object-cover hidden md:block"
            priority={isFirst}
            fetchPriority={isFirst ? "high" : "auto"}
            loading={isFirst ? "eager" : "lazy"}
          />
        </>
      ) : (
        <ImageWithSkeleton
          src={banner.image_url}
          alt={translation?.title || "Banner"}
          fill
          sizes="100vw"
          className="object-cover"
          priority={isFirst}
          fetchPriority={isFirst ? "high" : "auto"}
          loading={isFirst ? "eager" : "lazy"}
        />
      )}
      {hasText && (
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-foreground/60 via-foreground/20 to-transparent">
          <div className="mx-auto w-full max-w-7xl px-4 pb-10 md:pb-12 md:px-6 lg:pb-16">
            {translation?.title && (
              <TextAnimate
                as="h2"
                animation="blurInUp"
                by="word"
                once
                className="font-display text-3xl font-bold tracking-tight text-primary-foreground md:text-4xl lg:text-6xl drop-shadow-md"
              >
                {translation.title}
              </TextAnimate>
            )}
            {translation?.subtitle && (
              <TextAnimate
                as="p"
                animation="fadeIn"
                by="word"
                delay={0.3}
                once
                className="mt-2 max-w-lg text-base text-primary-foreground/80 md:text-lg drop-shadow-sm"
              >
                {translation.subtitle}
              </TextAnimate>
            )}
          </div>
        </div>
      )}
      {/* Gradient superior para proteger e mesclar suavemente com o header global */}
      <div className="pointer-events-none absolute left-0 top-0 right-0 h-32 bg-gradient-to-b from-black/50 via-black/20 to-transparent dark:from-black/70 dark:via-black/30 mix-blend-multiply" />
    </div>
  );
}
