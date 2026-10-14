"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ShoppingBag,
  Check,
  Package,
  Truck,
  FlaskConical,
  Flame,
  Pencil,
  Percent,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FadeUp, ScaleIn } from "@/components/motion";
import { VideoScrubHero } from "@/components/product/video-scrub-hero";
import { MobileFeaturedHero } from "@/components/product/mobile-featured-hero";
import { useMobileState } from "@/hooks/use-is-mobile";
import { ProductGallery } from "@/components/product/product-gallery";
import { StrainInfo } from "@/components/product/strain-info";
import { StrainMonogram } from "@/components/product/strain-monogram";
import { GeneticsTree } from "@/components/product/genetics-tree";
import { TerpeneProfile } from "@/components/product/terpene-profile";
import { RealPhotos } from "@/components/product/real-photos";
import { CropMarks } from "@/components/product/crop-marks";
import { LazyVideo } from "@/components/lazy-video";
import { RuledDivider } from "@/components/product/ruled-divider";
import { SpecimenBarcode } from "@/components/product/specimen-barcode";
import { DotPattern } from "@/components/ui/dot-pattern";
import { useCartStore } from "@/store/cart";
import { useCartConfirmationStore } from "@/store/cart-confirmation";
import { PriceDisplay } from "@/components/price-display";
import { HeaderThemeSentinel } from "@/components/header-theme-sentinel";
import {
  calculateDiscountedPrice,
  isPromotionActive,
} from "@/lib/format-price";
import { useLocale, useTranslations } from "next-intl";
import { formatProductSpecimenNo } from "@/lib/product-specimen-code";
import {
  variantPacksAvailable,
  LOW_STOCK_PACKS_THRESHOLD,
} from "@/lib/variant-stock";

interface Variant {
  id: string;
  slug: string;
  seed_count: number;
  price_cents: number;
  stock: number;
  on_sale?: boolean;
  discount_type?: string | null;
  discount_value?: number | null;
  sale_ends_at?: string | null;
}

interface FeaturedProductLandingProps {
  product: {
    id: string;
    slug: string;
    specimen_code?: string | null;
    images: string[];
    shipping_cents: number;
    seed_type: string | null;
    flowering_weeks_min: number | null;
    flowering_weeks_max: number | null;
    thc_min: number | null;
    thc_max: number | null;
    cbd_min: number | null;
    cbd_max: number | null;
    genetics: string | null;
    parent_mother: string | null;
    parent_father: string | null;
    real_photos: string[];
    show_real_photos: boolean;
    seed_bank_id: string | null;
    category_id?: string | null;
    categories?: {
      id: string;
      slug: string;
      category_translations: { name: string; locale: string }[];
    } | null;
    on_sale?: boolean;
    discount_type?: string | null;
    discount_value?: number | null;
    sale_ends_at?: string | null;
    variant_discounts_enabled?: boolean;
    stock: number;
    hero_frames: string[];
    hero_frames_lq?: string[];
    hero_poster_url?: string | null;
    seed_banks: {
      id: string;
      slug: string;
      logo_url: string;
      website: string;
      seed_bank_translations: {
        name: string;
        description: string;
      }[];
    } | null;
    product_translations: {
      name: string;
      description: string;
    }[];
    product_variants: Variant[];
    product_terpenes?: {
      is_dominant: boolean;
      terpenes: {
        id: string;
        slug: string;
        name: string;
        aroma: string;
        color: string;
      };
    }[];
  };
}

// ─── Seed Intro Section (bark bg + cursor glow) ───

const SEED_MACRO_SRC = "/videos/seed.mp4";

function SeedIntroSection({
  locale,
  shopReturnHref,
  translation,
  selectedPrices,
  seedBankName,
  t,
  pt,
}: {
  locale: string;
  shopReturnHref: string;
  translation: { name: string; description: string };
  selectedPrices: { displayCents: number; originalCents?: number; hasSale: boolean } | null;
  seedBankName: string | null;
  t: ReturnType<typeof useTranslations<"common">>;
  pt: ReturnType<typeof useTranslations<"product">>;
}) {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  // Cursor glow (desktop only)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, []);

  return (
    <section
      className="relative overflow-hidden bg-bark text-white"
      onMouseMove={handleMouseMove}
    >
      {/* Header stays dark through this section too, not just VideoScrubHero */}
      <HeaderThemeSentinel />
      {/* Cursor-follow radial glow (desktop only) */}
      <div
        className="pointer-events-none absolute inset-0 hidden opacity-30 transition-opacity duration-700 md:block"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(255 255 255 / 0.06), transparent 60%)`,
        }}
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 py-12 sm:grid-cols-2 md:gap-10 md:px-6 md:py-16 lg:gap-12 lg:py-20">
        {/* Left: text content */}
        <div className="flex min-w-0 flex-col justify-center sm:pr-2">
          <FadeUp>
            <Link
              href={shopReturnHref}
              className="mb-10 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-white/40 transition-colors hover:text-white/70"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("continueShopping")}
            </Link>
          </FadeUp>

          <FadeUp delay={0.1}>
            {seedBankName ? (
              <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-white/45">
                {seedBankName}
              </p>
            ) : null}
            <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              {translation.name}
            </h1>
          </FadeUp>

          <FadeUp delay={0.2}>
            <RuledDivider variant="ornamental" className="my-8 opacity-30" />
          </FadeUp>

          <FadeUp delay={0.3}>
            <p className="max-w-xl text-base leading-relaxed text-white/60 md:text-lg">
              {translation.description}
            </p>
          </FadeUp>

          {selectedPrices && (
            <FadeUp delay={0.4}>
              <div className="mt-10 flex items-center gap-6">
                <PriceDisplay
                  usdCents={selectedPrices.displayCents}
                  originalUsdCents={selectedPrices.originalCents}
                  size="xl"
                  priceClassName="text-white"
                />
                {selectedPrices.hasSale && (
                  <span className="inline-block rotate-1 border border-red-400/50 bg-red-500/20 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-red-300">
                    <Percent className="mr-1 inline h-3 w-3 -mt-0.5" />
                    {pt("onSale")}
                  </span>
                )}
              </div>
            </FadeUp>
          )}
        </div>

        {/* Right: seed macro video */}
        <div className="relative mx-auto w-full max-w-[min(100%,280px)] justify-self-center sm:mx-0 sm:max-w-sm sm:justify-self-start md:max-w-md lg:max-w-lg">
          <div className="relative aspect-[4/5] overflow-hidden rounded-full">
            <LazyVideo
              src={SEED_MACRO_SRC}
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Strain Card Gallery ─────────────────────────────────────────────────────

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov)($|\?)/i.test(url);
}

function StrainCardGallery({ images }: { images: string[] }) {
  const media = images;
  const count = media.length;
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [videoErrors, setVideoErrors] = useState<Set<number>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fallbackImage = media.find((url) => !isVideoUrl(url));

  const markVideoError = useCallback((i: number) => {
    setVideoErrors((prev) => {
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  }, []);

  const advance = useCallback(() => {
    setCurrent((c) => (c + 1) % count);
  }, [count]);

  const go = useCallback(
    (idx: number) => setCurrent(((idx % count) + count) % count),
    [count]
  );

  useEffect(() => {
    if (count <= 1 || paused) return;
    intervalRef.current = setInterval(advance, 3500);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        intervalRef.current = setInterval(advance, 3500);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [count, paused, advance]);

  if (!count) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center bg-foreground/5">
        <ShoppingBag className="h-12 w-12 text-foreground/20" />
      </div>
    );
  }

  return (
    <div
      className="relative aspect-[4/5] w-full overflow-hidden bg-foreground/5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Crossfade images with drag support */}
      <AnimatePresence mode="sync">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, { offset, velocity }) => {
            const swipe = Math.abs(offset.x) * velocity.x;
            if (swipe < -10000 || offset.x < -50) {
              go(current + 1);
            } else if (swipe > 10000 || offset.x > 50) {
              go(current - 1);
            }
          }}
        >
          {isVideoUrl(media[current]!) && !videoErrors.has(current) ? (
            <LazyVideo
              src={media[current]!}
              className="absolute inset-0 h-full w-full pointer-events-none"
              autoPlay
              loop
              muted
              playsInline
              preload="none"
              onError={() => markVideoError(current)}
            />
          ) : isVideoUrl(media[current]!) && videoErrors.has(current) && fallbackImage ? (
            <Image
              src={fallbackImage}
              alt=""
              fill
              className="object-cover pointer-events-none"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
          ) : !isVideoUrl(media[current]!) ? (
            <Image
              src={media[current]!}
              alt=""
              fill
              className="object-cover pointer-events-none"
              sizes="(max-width: 768px) 100vw, 40vw"
              priority={current === 0}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>

      {/* Film counter */}
      <div className="absolute bottom-3 right-3 z-10 font-mono text-[9px] tabular-nums text-white/60">
        {String(current + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
      </div>

      {/* Dot indicators (max 8) */}
      {count > 1 && count <= 8 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {media.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Media ${i + 1}`}
              className={cn(
                "h-[3px] rounded-full transition-all duration-300",
                i === current
                  ? "w-5 bg-white"
                  : "w-[5px] bg-white/40 hover:bg-white/70"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function FeaturedProductLanding({
  product,
}: FeaturedProductLandingProps) {
  const locale = useLocale();
  const t = useTranslations("common");
  const pt = useTranslations("product");
  const { user } = useUser();
  const isAdmin =
    (user?.publicMetadata as { role?: string })?.role === "admin";
  const addItem = useCartStore((s) => s.addItem);
  const showConfirmation = useCartConfirmationStore((s) => s.show);
  const translation = product.product_translations[0];
  const variants = product.product_variants ?? [];
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    variants[0] ?? null
  );
  const [quantity, setQuantity] = useState(1);
  const [terpeneAnimKey, setTerpeneAnimKey] = useState(0);
  const mobileState = useMobileState();

  if (!translation) return null;

  const totalStock = product.stock;
  const selectedPacksAvailable = selectedVariant
    ? variantPacksAvailable(totalStock, selectedVariant.seed_count)
    : 0;
  const outOfStock = selectedVariant
    ? selectedPacksAvailable <= 0
    : totalStock <= 0;
  const isLowStock =
    !outOfStock &&
    selectedVariant != null &&
    selectedPacksAvailable > 0 &&
    selectedPacksAvailable <= LOW_STOCK_PACKS_THRESHOLD;

  const dominantEntry = product.product_terpenes?.find((t) => t.is_dominant);
  const dominantTerpene = dominantEntry
    ? {
        name: pt.has(`terpenes.${dominantEntry.terpenes.slug}.name`)
          ? pt(`terpenes.${dominantEntry.terpenes.slug}.name` as never)
          : dominantEntry.terpenes.name,
        aroma: pt.has(`terpenes.${dominantEntry.terpenes.slug}.aroma`)
          ? pt(`terpenes.${dominantEntry.terpenes.slug}.aroma` as never)
          : dominantEntry.terpenes.aroma,
        color: dominantEntry.terpenes.color,
      }
    : null;

  const seedBankName =
    product.seed_banks?.seed_bank_translations?.[0]?.name ?? null;
  const categoryName =
    product.categories?.category_translations?.find((t) => t.locale === locale)
      ?.name ??
    product.categories?.category_translations?.[0]?.name ??
    null;
  const heroEyebrow = categoryName ?? seedBankName;

  function getVariantPrices(v: Variant) {
    const productOnSale = isPromotionActive(
      product.on_sale,
      product.sale_ends_at
    );
    if (
      product.variant_discounts_enabled &&
      isPromotionActive(v.on_sale, v.sale_ends_at) &&
      v.discount_type &&
      v.discount_value
    ) {
      return {
        displayCents: calculateDiscountedPrice(
          v.price_cents,
          v.discount_type,
          v.discount_value
        ),
        originalCents: v.price_cents,
        hasSale: true,
      };
    }
    if (productOnSale && product.discount_type && product.discount_value) {
      return {
        displayCents: calculateDiscountedPrice(
          v.price_cents,
          product.discount_type,
          product.discount_value
        ),
        originalCents: v.price_cents,
        hasSale: true,
      };
    }
    return { displayCents: v.price_cents, originalCents: undefined, hasSale: false };
  }

  const selectedPrices = selectedVariant
    ? getVariantPrices(selectedVariant)
    : null;

  // Restore shop return URL (with filters) from sessionStorage
  const [shopReturnHref, setShopReturnHref] = useState<string>(`/${locale}/loja`);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const qs = window.sessionStorage.getItem("shopFiltersQS");
      setShopReturnHref(qs ? `/${locale}/loja?${qs}` : `/${locale}/loja`);
    } catch {
      // ignore storage errors
    }
  }, [locale]);

  // Shared add-to-cart handler — avoids duplicating the same block in every section
  const handleAddToCart = useCallback(() => {
    if (!selectedVariant || !selectedPrices) return;
    const imageSrc =
      product.images.find((img) => !/\.(mp4|webm|mov)($|\?)/i.test(img)) ??
      product.images[0] ??
      "";
    const videoSrc = product.images.find((img) =>
      /\.(mp4|webm|mov)($|\?)/i.test(img)
    );
    const variantLabel = `${selectedVariant.seed_count} ${pt("seeds")}`;
    addItem(
      {
        variantId: selectedVariant.id,
        productId: product.id,
        slug: product.slug,
        name: translation.name,
        variantLabel,
        priceCents: selectedPrices.displayCents,
        originalPriceCents: selectedPrices.originalCents,
        shippingCents: product.shipping_cents,
        image: imageSrc,
        video: videoSrc,
      },
      quantity
    );
    showConfirmation({
      name: translation.name,
      variantLabel,
      priceCents: selectedPrices.displayCents,
      originalPriceCents: selectedPrices.originalCents,
      image: imageSrc,
    });
    setQuantity(1);
  }, [selectedVariant, selectedPrices, product, translation.name, pt, addItem, showConfirmation, quantity]);

  return (
    <div className="-mt-16 md:-mt-20">
      {/* Admin bar */}
      {isAdmin && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-4 rounded-full border border-black/10 bg-primary/95 px-5 py-2.5 text-primary-foreground shadow-2xl backdrop-blur-md">
          <span className="hidden md:flex items-center gap-2 text-sm font-medium opacity-90">
            <Pencil className="h-4 w-4" />
            {pt("adminEditBar")}
          </span>
          <Link
            href={`/${locale}/admin/produtos/${product.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-bold transition-colors hover:bg-primary-foreground/30"
          >
            {pt("adminEditAction")}
          </Link>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          SECTION 1 — Hero (desktop: video scrub, mobile: static poster)
          Mobile branch avoids mounting VideoScrubHero so the 150+ frame
          images never get fetched/decoded on phones.
          ═══════════════════════════════════════════ */}
      {mobileState === "mobile" ? (
        <MobileFeaturedHero
          posterSrc={product.hero_poster_url ?? product.images[0] ?? ""}
          productName={translation.name}
          eyebrow={heroEyebrow}
          scrollLabel={pt("scrollLabel")}
        />
      ) : mobileState === "desktop" ? (
        <VideoScrubHero
          frames={product.hero_frames}
          lowResFrames={product.hero_frames_lq}
          posterSrc={product.hero_poster_url ?? undefined}
          productName={translation.name}
          eyebrow={heroEyebrow}
        />
      ) : (
        // SSR / first paint: render poster placeholder with the same aspect
        // so there's no layout shift when we resolve the viewport.
        <div
          className="relative w-full overflow-hidden aspect-[3/4] md:h-dvh md:aspect-auto bg-black"
          aria-hidden
        >
          {product.hero_poster_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.hero_poster_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-80"
            />
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          SECTION 2 — Product Intro (Dark) + Seed Image
          ═══════════════════════════════════════════ */}
      <SeedIntroSection
        locale={locale}
        shopReturnHref={shopReturnHref}
        translation={translation}
        selectedPrices={selectedPrices}
        seedBankName={seedBankName}
        t={t}
        pt={pt}
      />

      {/* ═══════════════════════════════════════════
          SECTION 3 — Variant Selector + Gallery
          ═══════════════════════════════════════════ */}
      <section className="py-12 md:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
            {/* Gallery */}
            <FadeUp>
              <ProductGallery media={product.images} alt={translation.name} />
            </FadeUp>

            {/* Purchase column */}
            <FadeUp delay={0.15}>
              <div className="flex flex-col justify-center">
                <div>
                  {!outOfStock ? (
                    <span className="mb-4 inline-block -rotate-1 border border-foreground/30 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-foreground/60">
                      <Check className="mr-1 inline h-3 w-3 -mt-0.5" />
                      {pt("inStock")}
                    </span>
                  ) : (
                    <span className="mb-4 inline-block -rotate-2 border border-destructive/50 bg-destructive/5 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-destructive">
                      {pt("outOfStock")}
                    </span>
                  )}

                  {selectedPrices?.hasSale && (
                    <span className="mb-4 ml-2 inline-block rotate-1 border border-red-500/50 bg-red-500/10 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-red-600">
                      <Percent className="mr-1 inline h-3 w-3 -mt-0.5" />
                      {pt("onSale")}
                    </span>
                  )}

                  {seedBankName ? (
                    <p className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-foreground/50">
                      {seedBankName}
                    </p>
                  ) : null}

                  <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                    {translation.name}
                  </h2>
                </div>

                <RuledDivider variant="ornamental" className="my-6" />

                {/* Variant Selector */}
                {variants.length > 0 && (
                  <div className="mb-6">
                    <h3 className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/50">
                      {pt("selectVariant")}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {variants.map((v) => {
                        const vOut =
                          variantPacksAvailable(totalStock, v.seed_count) <= 0;
                        return (
                        <motion.button
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          disabled={vOut}
                          whileHover={!vOut ? { scale: 1.02 } : undefined}
                          whileTap={!vOut ? { scale: 0.98 } : undefined}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className={`relative flex items-center justify-between gap-3 border px-4 py-2 text-left transition-colors w-full sm:w-auto flex-1 ${
                            selectedVariant?.id === v.id
                              ? "border-foreground bg-foreground/5 shadow-[inset_0_0_0_1px_currentColor]"
                              : vOut
                                ? "border-foreground/10 opacity-50 cursor-not-allowed"
                                : "border-foreground/20 hover:border-foreground/50"
                          }`}
                        >
                          <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em]">
                            <Package className="h-3.5 w-3.5 opacity-50" />
                            {v.seed_count} {pt("seeds")}
                          </span>
                          <span className="text-right">
                            {(() => {
                              const vp = getVariantPrices(v);
                              return (
                                <PriceDisplay
                                  usdCents={vp.displayCents}
                                  originalUsdCents={vp.originalCents}
                                  size="sm"
                                />
                              );
                            })()}
                          </span>
                        </motion.button>
                      );
                      })}
                    </div>
                  </div>
                )}

                {selectedVariant && selectedPrices && (
                  <div className="mb-6">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedVariant.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                      >
                        <PriceDisplay
                          usdCents={selectedPrices.displayCents}
                          originalUsdCents={selectedPrices.originalCents}
                          size="xl"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}

                {/* Shipping */}
                {product.shipping_cents > 0 && (
                  <div className="mb-6 flex items-start gap-3 border border-foreground/25 bg-muted/50 px-4 py-3">
                    <Truck className="h-4 w-4 shrink-0 text-foreground/80 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <div>
                        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-foreground/90">
                          {pt("shippingFixed")}:{" "}
                        </span>
                        <PriceDisplay
                          usdCents={product.shipping_cents}
                          size="sm"
                        />
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-foreground/70">
                        {pt("shippingWorldwide")}
                      </span>
                    </div>
                  </div>
                )}

                {/* Low stock badge */}
                {isLowStock && (
                  <motion.div
                    key={`low-stock-${selectedVariant?.id}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 flex items-center gap-2 border border-amber-500/40 bg-amber-500/10 px-3 py-2"
                  >
                    <Flame className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400">
                      {pt("lowStock", { count: selectedVariant!.stock })}
                    </span>
                  </motion.div>
                )}

                {/* Add to Cart */}
                <div className="mb-6 flex gap-2">
                  {/* Quantity stepper */}
                  <div className="flex shrink-0 items-center border border-foreground/20">
                    <button
                      className="flex h-11 w-9 items-center justify-center text-foreground/60 transition-colors hover:text-foreground disabled:opacity-30"
                      disabled={outOfStock || quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="flex h-11 w-10 items-center justify-center border-x border-foreground/20 font-mono text-xs">
                      {quantity}
                    </span>
                    <button
                      className="flex h-11 w-9 items-center justify-center text-foreground/60 transition-colors hover:text-foreground disabled:opacity-30"
                      disabled={outOfStock}
                      onClick={() => setQuantity((q) => q + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Button
                    size="lg"
                    className="flex-1 gap-2 rounded-none font-mono text-[11px] font-bold uppercase tracking-[0.15em]"
                    disabled={outOfStock || !selectedVariant}
                    onClick={handleAddToCart}
                  >
                    {outOfStock ? (
                      pt("outOfStock")
                    ) : (
                      <>
                        <ShoppingBag className="h-4 w-4" />
                        {t("addToCart")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 4 — Industrial Strain Science Card (Specimen File layout)
          ═══════════════════════════════════════════ */}
      {(product.seed_type ||
        product.genetics ||
        product.flowering_weeks_min ||
        product.thc_min !== null ||
        product.seed_banks ||
        product.parent_mother ||
        product.parent_father ||
        product.product_terpenes?.length) && (
        <section className="pb-12 md:pb-16 lg:pb-20">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <ScaleIn>
              <div className="relative p-3 md:p-4">
                <CropMarks />
                <div
                  className="relative overflow-hidden border-x border-x-foreground/40 border-t-[3px] border-b-[3px] border-foreground bg-card"
                >
                  <DotPattern width={12} height={12} cr={0.5} className="text-foreground opacity-[0.025]" />

                  {/* ── Header Bar: word-by-word teletype reveal ── */}
                  <div className="relative border-b border-foreground/20 px-5 py-2 md:px-6">
                    <div className="flex items-center justify-between">
                      <motion.div
                        className="flex items-center gap-2"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={{
                          hidden: {},
                          visible: { transition: { staggerChildren: 0.08 } },
                        }}
                      >
                        <FlaskConical className="h-3.5 w-3.5 shrink-0 text-foreground/50" />
                        {pt("strainScience")
                          .split(" ")
                          .map((word, i) => (
                            <motion.span
                              key={i}
                              className="font-display text-sm font-bold uppercase tracking-[0.2em] text-foreground/80"
                              variants={{
                                hidden: { opacity: 0, y: 8 },
                                visible: {
                                  opacity: 1,
                                  y: 0,
                                  transition: {
                                    duration: 0.35,
                                    ease: [0.16, 1, 0.3, 1],
                                  },
                                },
                              }}
                            >
                              {word}
                            </motion.span>
                          ))}
                      </motion.div>
                      <div className="flex items-center gap-4">
                        <span className="hidden text-[9px] font-mono uppercase tracking-[0.15em] text-foreground/30 sm:block">
                          {translation.name}
                        </span>
                        <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-foreground/40">
                          No.{" "}
                          {formatProductSpecimenNo({
                            ...product,
                            productName: translation.name,
                          })}
                        </span>
                      </div>
                    </div>
                    <RuledDivider variant="ornamental" className="mt-2" />
                  </div>

                  {/* ── Stats Row: full-width ── */}
                  {(product.seed_type ||
                    product.flowering_weeks_min ||
                    product.thc_min !== null ||
                    product.seed_banks) && (
                    <div className="border-b border-foreground/15">
                      <StrainInfo
                        seedBank={
                          product.seed_banks?.seed_bank_translations[0]
                            ? {
                                name: product.seed_banks
                                  .seed_bank_translations[0].name,
                                website:
                                  product.seed_banks.website || undefined,
                              }
                            : null
                        }
                        seedType={product.seed_type}
                        seedTypeLabel={
                          product.seed_type
                            ? pt(`seedTypes.${product.seed_type}`)
                            : ""
                        }
                        floweringMin={product.flowering_weeks_min}
                        floweringMax={product.flowering_weeks_max}
                        thcMax={product.thc_max}
                        cbdMax={product.cbd_max}
                        labels={{
                          seedBank: pt("seedBank"),
                          seedType: pt("seedType"),
                          floweringTime: pt("floweringTime"),
                          weeks: pt("weeks"),
                        }}
                      />
                    </div>
                  )}

                  {/* ── Body: photo + monogram + genetics + terpenes ── */}
                  <div className="flex flex-col">
                    {/* Row 1 */}
                    <div className="flex flex-col md:flex-row md:items-stretch">
                      {/* Left: Image */}
                      {product.images.length > 0 && (
                        <div className="border-b border-foreground/15 md:w-[40%] lg:w-[35%] md:border-b-0 md:border-r md:self-start">
                          <StrainCardGallery images={product.images} />
                        </div>
                      )}

                      {/* Right: Monogram + Genetics row, Description below */}
                      {(product.seed_type ||
                        product.parent_mother ||
                        product.parent_father ||
                        product.genetics) && (
                        <div
                          className={cn(
                            "flex min-w-0 flex-1",
                            product.images.length > 0 ? "" : "w-full"
                          )}
                        >
                          <div className="flex min-w-0 flex-1 flex-col">
                            {/* Monogram + Genetics side by side at lg */}
                            <div className="flex flex-col border-b border-foreground/15 lg:flex-row lg:items-stretch">
                              {/* Monogram */}
                              <div className="relative flex flex-col border-b border-foreground/15 p-4 md:p-5 lg:w-1/2 lg:border-b-0 lg:border-r lg:p-4">
                                <p className="mb-3 text-[10px] font-mono font-semibold uppercase tracking-[0.25em] text-foreground/50">
                                  <FlaskConical className="mr-1 -mt-0.5 inline h-3 w-3" />
                                  {pt("strainInfo")}
                                </p>
                                <StrainMonogram
                                  name={translation.name}
                                  seedType={product.seed_type}
                                  thcMax={product.thc_max}
                                  cbdMax={product.cbd_max}
                                  dominantTerpene={dominantTerpene}
                                  specimenNo={formatProductSpecimenNo({
                                    ...product,
                                    productName: translation.name,
                                  })}
                                />
                              </div>

                              {/* Genetics */}
                              {(product.parent_mother ||
                                product.parent_father ||
                                product.genetics) && (
                                <div className="relative flex w-full min-w-0 flex-col items-center justify-center px-3 py-4 sm:px-4 md:px-5 lg:w-1/2 lg:p-4">
                                  <p className="mb-2 text-center text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/40">
                                    {pt("genetics")}
                                  </p>
                                  <div className="flex w-full justify-center overflow-hidden">
                                    <GeneticsTree
                                      genetics={product.genetics}
                                      parentMother={product.parent_mother}
                                      parentFather={product.parent_father}
                                      childName={translation.name}
                                      motherLabel={pt("parentMother")}
                                      fatherLabel={pt("parentFather")}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Description */}
                            {translation.description && (
                              <div className="relative p-4 md:p-5 lg:p-4">
                                <p className="mb-1.5 text-[10px] font-mono font-semibold uppercase tracking-[0.25em] text-foreground/50">
                                  {pt("description")}
                                </p>
                                <p className="line-clamp-4 text-sm font-sans leading-relaxed text-foreground/60 lg:line-clamp-3">
                                  {translation.description}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Barcode strip */}
                          <div className="relative hidden overflow-hidden border-l border-foreground/15 lg:block lg:w-12 xl:w-14">
                            <SpecimenBarcode className="absolute left-1/2 top-1/2 w-64 xl:w-80 2xl:w-96 aspect-[15/1] max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-90 text-foreground opacity-[0.07]" />
                          </div>
                        </div>
                      )}

                      {/* Terpenes — inline column at lg+ */}
                      {product.product_terpenes &&
                        product.product_terpenes.length > 0 && (
                          <div className="hidden border-l border-foreground/15 bg-foreground/5 p-4 lg:block lg:w-[220px] xl:w-[240px]">
                            <TerpeneProfile
                              entries={product.product_terpenes}
                              animKey={terpeneAnimKey}
                              compact
                            />
                          </div>
                        )}
                    </div>

                    {/* Terpenes — full-width row below lg */}
                    {product.product_terpenes &&
                      product.product_terpenes.length > 0 && (
                        <div className="relative border-t border-foreground/15 bg-foreground/5 p-4 md:p-5 lg:hidden">
                          <TerpeneProfile
                            entries={product.product_terpenes}
                            animKey={terpeneAnimKey}
                          />
                        </div>
                      )}
                  </div>

                  {/* ── Footer Bar ── */}
                  <div className="relative border-t border-foreground/20 px-5 py-2 md:px-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono font-semibold uppercase tracking-[0.25em] text-foreground/30">
                        Sementes de Colecao
                      </span>
                      <div className="flex items-center gap-2">
                        <RuledDivider
                          variant="ornamental"
                          className="hidden w-12 sm:flex"
                        />
                      </div>
                      <div className="flex gap-4">
                        {product.seed_type && (
                          <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-foreground/30">
                            {product.seed_type}
                          </span>
                        )}
                        {product.thc_max !== null && (
                          <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-foreground/30">
                            THC {product.thc_max}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScaleIn>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          SECTION 5 — Real Photos
          ═══════════════════════════════════════════ */}
      {product.show_real_photos && product.real_photos.length > 0 && (
        <section className="pb-12 md:pb-16 lg:pb-20">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <FadeUp>
              <RealPhotos
                photos={product.real_photos}
                title={pt("realPhotos")}
              />
            </FadeUp>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          SECTION 6 — Final CTA
          ═══════════════════════════════════════════ */}
      <section className="border-t border-foreground/10 bg-secondary/30 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
          <FadeUp>
            {seedBankName ? (
              <p className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-foreground/50">
                {seedBankName}
              </p>
            ) : null}
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              {translation.name}
            </h2>
            {/* Variant selector */}
            {variants.length > 1 && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {variants.map((v) => {
                  const vOut =
                    variantPacksAvailable(totalStock, v.seed_count) <= 0;
                  return (
                  <button
                    key={v.id}
                    onClick={() => { setSelectedVariant(v); setQuantity(1); }}
                    disabled={vOut}
                    className={`flex items-center gap-2 border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${
                      selectedVariant?.id === v.id
                        ? "border-foreground bg-foreground/5 shadow-[inset_0_0_0_1px_currentColor]"
                        : vOut
                          ? "border-foreground/10 opacity-40 cursor-not-allowed"
                          : "border-foreground/20 hover:border-foreground/50"
                    }`}
                  >
                    <Package className="h-3.5 w-3.5 opacity-50" />
                    {v.seed_count} {pt("seeds")}
                  </button>
                  );
                })}
              </div>
            )}

            {selectedPrices && (
              <div className="mt-4 flex justify-center">
                <PriceDisplay
                  usdCents={selectedPrices.displayCents}
                  originalUsdCents={selectedPrices.originalCents}
                  size="xl"
                />
              </div>
            )}
            <div className="mt-8 flex justify-center gap-2">
              {/* Quantity stepper */}
              <div className="flex shrink-0 items-center border border-foreground/20">
                <button
                  className="flex h-11 w-9 items-center justify-center text-foreground/60 transition-colors hover:text-foreground disabled:opacity-30"
                  disabled={outOfStock || quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="flex h-11 w-10 items-center justify-center border-x border-foreground/20 font-mono text-xs">
                  {quantity}
                </span>
                <button
                  className="flex h-11 w-9 items-center justify-center text-foreground/60 transition-colors hover:text-foreground disabled:opacity-30"
                  disabled={outOfStock}
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <Button
                size="lg"
                className="gap-2 rounded-none font-mono text-[11px] font-bold uppercase tracking-[0.15em]"
                disabled={outOfStock || !selectedVariant}
                onClick={handleAddToCart}
              >
                {outOfStock ? (
                  pt("outOfStock")
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    {t("addToCart")}
                  </>
                )}
              </Button>
            </div>
            <Link
              href={shopReturnHref}
              className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-foreground/50 transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("continueShopping")}
            </Link>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
