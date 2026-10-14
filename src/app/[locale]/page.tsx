import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Leaf, Sprout, FlaskConical, Dna } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { createServerClient } from "@/lib/supabase/server";

// ISR: revalidate every hour. Drastically reduces Supabase egress vs. a fresh
// fetch per request. Admin mutations should call revalidatePath("/") on save.
export const revalidate = 3600;
import { applyBundleEffectiveStock } from "@/lib/bundle-stock";
import { Button } from "@/components/ui/button";
import {
  FadeUp,
  ImageReveal,
  StaggerGroup,
  StaggerItem,
} from "@/components/motion";
import { HeroBanner } from "@/components/hero-banner";
import { AnimatedHeading } from "@/components/animated-heading";
import { RuledDivider } from "@/components/product/ruled-divider";
import { CropMarks } from "@/components/product/crop-marks";
import { DotPattern } from "@/components/ui/dot-pattern";
import Incentive5 from "@/components/incentive-5";
import { ShopContent } from "./loja/shop-content";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/structured-data";
import { FaqSection } from "@/components/faq-section";
import { HomepageDeferredSections } from "./homepage-deferred-sections";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("metadata");

  const siteUrl = "https://sementesdecolecao.com";
  const localePrefix = locale === "pt" ? "" : `/${locale}`;

  return {
    title: t("homeTitle"),
    description: t("homeDescription"),
    alternates: {
      canonical: `${siteUrl}${localePrefix}`,
      languages: {
        "pt-BR": siteUrl,
        en: `${siteUrl}/en`,
        es: `${siteUrl}/es`,
      },
    },
    openGraph: {
      title: t("homeTitle"),
      description: t("homeDescription"),
      url: `${siteUrl}${localePrefix}`,
      images: [
        {
          url: "/images/opengraph-semente1.png",
          width: 1200,
          height: 630,
          alt: t("homeTitle"),
        },
      ],
    },
  };
}

type ProductCardProduct = {
  id: string;
  slug: string;
  product_type: string;
  images: string[];
  stock: number;
  seed_type?: string | null;
  on_sale?: boolean;
  discount_type?: string | null;
  discount_value?: number | null;
  sale_ends_at?: string | null;
  variant_discounts_enabled?: boolean;
  product_translations: { name: string; description: string }[];
  product_variants: {
    id: string;
    seed_count: number;
    price_cents: number;
    stock: number;
    on_sale?: boolean;
    discount_type?: string | null;
    discount_value?: number | null;
    sale_ends_at?: string | null;
  }[];
};

export default async function HomePage() {
  const locale = await getLocale();
  const mt = await getTranslations("metadata");
  const supabase = createServerClient();

  const [{ data: products }, { data: categories }, { data: seedBanks }, { data: terpenes }, { data: banners }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          `id, slug, product_type, images, stock, shipping_cents, seed_type, seed_bank_id, category_id, flavors,
           on_sale, discount_type, discount_value, sale_ends_at, variant_discounts_enabled,
           product_translations!inner(name, description),
           product_variants(id, seed_count, price_cents, stock, on_sale, discount_type, discount_value, sale_ends_at),
           product_terpenes(is_dominant, terpenes(id, name, color)),
           categories(id, slug, category_translations!inner(name))`
        )
        .eq("product_translations.locale", locale)
        .eq("active", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("id, slug, category_translations!inner(name)")
        .eq("category_translations.locale", locale),
      supabase
        .from("seed_banks")
        .select("id, slug, seed_bank_translations!inner(name)")
        .eq("seed_bank_translations.locale", locale),
      supabase
        .from("terpenes")
        .select("id, slug, name, color")
        .order("name"),
      supabase
        .from("hero_banners")
        .select("id, image_url, image_url_mobile, media_type, link, hero_banner_translations!inner(title, subtitle)")
        .eq("active", true)
        .eq("hero_banner_translations.locale", locale)
        .order("sort_order"),
    ]);

  // Compute effective stock for bundle products
  // (bundle.stock is always 0 — real availability derives from component stocks)
  await applyBundleEffectiveStock(
    supabase,
    (products ?? []) as unknown as { id: string; product_type?: string | null; stock?: number | null }[]
  );

  return (
    <div className="-mt-16 md:-mt-20">
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      {/* ─── Hero ─── */}
      {banners && banners.length > 0 ? (
        <HeroBanner banners={banners} />
      ) : (
        <section className="relative overflow-hidden bg-secondary py-12 md:py-16 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-5 md:items-center md:px-6">
            <FadeUp className="md:col-span-3">
              <p className="text-sm font-medium uppercase tracking-widest text-primary/70">
                {mt("heroTagline")}
              </p>
              <AnimatedHeading
                as="h1"
                animation="blurInUp"
                by="word"
                delay={0.1}
                className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl"
              >
                {mt("heroHeading")}
              </AnimatedHeading>
              <AnimatedHeading
                as="p"
                animation="fadeIn"
                by="word"
                delay={0.3}
                className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground"
              >
                {mt("heroSub")}
              </AnimatedHeading>
              <Link href="#catalog" className="mt-8 inline-block">
                <Button size="lg" className="rounded-full px-8 text-sm uppercase tracking-wide">
                  {mt("heroCta")}
                </Button>
              </Link>
            </FadeUp>
            <ImageReveal className="md:col-span-2">
              <div className="flex aspect-[3/4] items-center justify-center rounded-2xl bg-muted/50">
                <Leaf className="h-16 w-16 text-muted-foreground/30" />
              </div>
            </ImageReveal>
          </div>
        </section>
      )}

      {/* ─── Thailand Expedition (Temporarily Hidden) ─── */}
      {false && (
        <section className="py-12 md:py-16 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-2 md:gap-12 md:px-6">
            {/* Image */}
            <ImageReveal direction="left">
              <div className="relative aspect-[4/3] overflow-hidden rounded-none border-t-[2px] border-b-[2px] border-foreground bg-secondary">
                <Image
                  src="/images/maracuruja/thailand expedition.png"
                  alt="Thailand Expedition"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </ImageReveal>

            {/* Content */}
            <FadeUp delay={0.1} className="flex flex-col justify-center">
              <span className="inline-block w-fit border border-foreground/30 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-foreground/70 -rotate-2">
                {mt("expeditionTag")}
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl">
                {mt("expeditionTitle")}
              </h2>
              <RuledDivider variant="ornamental" className="my-4" />
              <p className="max-w-md leading-relaxed text-muted-foreground">
                {mt("expeditionDescription")}
              </p>
              <Link href="#catalog" className="mt-8 inline-block">
                <Button size="lg" className="rounded-full px-8 text-sm uppercase tracking-wide">
                  {mt("expeditionCta")}
                </Button>
              </Link>
            </FadeUp>
          </div>
        </section>
      )}

      {/* ─── Seed Type Categories (Temporarily Disabled) ─── */}
      {/*
      <section className="py-12 md:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <FadeUp>
            <div className="mb-10 text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                {mt("categoriesTitle")}
              </h2>
              <RuledDivider variant="ornamental" className="mx-auto mt-4 max-w-xs" />
            </div>
          </FadeUp>

          <StaggerGroup className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Sprout, label: mt("categoryFeminized"), slug: "feminized" },
              { icon: FlaskConical, label: mt("categoryAutoflower"), slug: "autoflower" },
              { icon: Dna, label: mt("categoryRegular"), slug: "regular" },
            ].map((cat) => (
              <StaggerItem key={cat.slug}>
                <Link href={`/${locale}/loja?type=${cat.slug}`} className="group block">
                  <div className="relative rounded-none border-t-[2px] border-foreground border-x border-b border-foreground/20 bg-card p-6 transition-colors hover:bg-foreground/[0.02]">
                    <DotPattern width={12} height={12} cr={0.5} className="text-foreground opacity-[0.025] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black_70%)]" />
                    <div className="relative flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-foreground/20 bg-card">
                        <cat.icon className="h-5 w-5 text-foreground/60" />
                      </div>
                      <div>
                        <h3 className="font-display text-base font-bold uppercase tracking-[0.1em]">
                          {cat.label}
                        </h3>
                        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/40">
                          {mt("viewCollection")}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>
      */}

      {/* ─── Flash Sale + Featured (deferred, fetched client-side after LCP) ─── */}
      <HomepageDeferredSections />

      {/* ─── Catalog ─── */}
      <section id="catalog" className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <ShopContent
            products={products ?? []}
            categories={categories ?? []}
            seedBanks={seedBanks ?? []}
            terpenes={terpenes ?? []}
          />
        </div>
      </section>

      {/* ─── Incentives / Trust Badges ─── */}
      <Incentive5
        incentives={[
          { icon: "ShieldCheck", title: mt("feature1Title"), description: mt("feature1Desc") },
          { icon: "Package", title: mt("feature2Title"), description: mt("feature2Desc") },
          { icon: "Zap", title: mt("feature3Title"), description: mt("feature3Desc") },
          { icon: "Truck", title: mt("feature4Title"), description: mt("feature4Desc") },
        ]}
      />

      {/* ─── FAQ ─── */}
      <FaqSection />
    </div>
  );
}
