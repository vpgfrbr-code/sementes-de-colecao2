import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createServerClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { ProductDetail } from "./product-detail";
import { FeaturedProductLanding } from "@/components/product/featured-product-landing";
import { ProductJsonLd, BreadcrumbJsonLd } from "@/components/structured-data";
import {
  ProductReviewsSection,
  computeAggregate,
  type PublicReview,
} from "@/components/product-reviews-section";
import { getStrainScienceCardEnabled } from "@/lib/app-settings";

// ISR: revalidate every hour. Reduces Supabase egress when the same product
// is hit by many visitors. Admin product mutations should call
// revalidatePath(`/produto/${slug}`) on save.
export const revalidate = 3600;

function generateFramePaths(prefix: string, count: number, extension: string): string[] {
  return Array.from({ length: count }, (_, i) => {
    const num = String(i + 1).padStart(4, "0");
    return `${prefix}${num}${extension}`;
  });
}

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

interface ProductWithTranslations {
  id: string;
  slug: string;
  product_type: string;
  specimen_code: string | null;
  images: string[];
  stock: number;
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
  category_id: string | null;
  categories: {
    id: string;
    slug: string;
    category_translations: { name: string; locale: string }[];
  } | null;
  on_sale: boolean;
  discount_type: string | null;
  discount_value: number | null;
  sale_ends_at: string | null;
  variant_discounts_enabled: boolean;
  flavors: string[] | null;
  is_featured: boolean;
  hero_video_url: string | null;
  hero_poster_url: string | null;
  hero_frame_count: number | null;
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
  product_variants: {
    id: string;
    slug: string;
    seed_count: number;
    price_cents: number;
    stock: number;
    on_sale: boolean;
    discount_type: string | null;
    discount_value: number | null;
    sale_ends_at: string | null;
  }[];
  product_terpenes: {
    is_dominant: boolean;
    terpenes: {
      id: string;
      slug: string;
      name: string;
      aroma: string;
      color: string;
    };
  }[];
  bundle_components: {
    component_product_id: string;
    seed_count: number;
    products: {
      id: string;
      slug: string;
      stock: number;
      product_translations: { name: string; locale: string }[];
    } | null;
  }[];
}

async function getProduct(slug: string, locale: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, slug, product_type, specimen_code, images, stock, shipping_cents,
       seed_type, flowering_weeks_min, flowering_weeks_max,
       thc_min, thc_max, cbd_min, cbd_max, genetics,
       parent_mother, parent_father, real_photos, show_real_photos,
       seed_bank_id, category_id, flavors,
       on_sale, discount_type, discount_value, sale_ends_at, variant_discounts_enabled,
       is_featured, hero_video_url, hero_poster_url, hero_frame_count,
       seed_banks(id, slug, logo_url, website, seed_bank_translations(name, description, locale)),
       categories(id, slug, category_translations(name, locale)),
       product_translations(name, description, locale),
       product_variants(id, slug, seed_count, price_cents, stock, on_sale, discount_type, discount_value, sale_ends_at),
       product_terpenes(is_dominant, terpenes(id, slug, name, aroma, color)),
       bundle_components!bundle_components_bundle_product_id_fkey(component_product_id, seed_count, products!bundle_components_component_product_id_fkey(id, slug, stock, product_translations(name, locale)))`
    )
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    // PostgrestError fields are non-enumerable; log as a JSON string so the
    // payload is readable in both the dev server terminal and any forwarded
    // browser console.
    console.error(
      "[produto/getProduct] supabase error:",
      JSON.stringify(
        {
          slug,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
        null,
        2
      )
    );
    return null;
  }
  if (!data) return null;

  // Locale-aware sort: requested locale first, then PT (canonical), then others.
  // Existing consumers use `[0]` so the chosen translation must end up at index 0.
  const sortByLocale = <T extends { locale?: string | null }>(
    rows: T[] | null | undefined
  ): T[] => {
    if (!rows || rows.length === 0) return [];
    const score = (row: T) =>
      row.locale === locale ? 0 : row.locale === "pt" ? 1 : 2;
    return [...rows].sort((a, b) => score(a) - score(b));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const product = data as any;
  product.product_translations = sortByLocale(product.product_translations);
  if (product.seed_banks) {
    product.seed_banks.seed_bank_translations = sortByLocale(
      product.seed_banks.seed_bank_translations
    );
  }
  if (product.categories) {
    product.categories.category_translations = sortByLocale(
      product.categories.category_translations
    );
  }
  if (Array.isArray(product.bundle_components)) {
    for (const comp of product.bundle_components) {
      if (comp?.products) {
        comp.products.product_translations = sortByLocale(
          comp.products.product_translations
        );
      }
    }
  }

  // Derive effective stock for bundles from component availability.
  // Bundles store stock = 0 in the row; the real capacity is the minimum
  // floor(component.stock / component.seed_count) across all components.
  if (
    product.product_type === "bundle" &&
    Array.isArray(product.bundle_components) &&
    product.bundle_components.length > 0
  ) {
    let effective = Number.POSITIVE_INFINITY;
    for (const comp of product.bundle_components) {
      const compStock = comp?.products?.stock ?? 0;
      const seedCount = comp?.seed_count ?? 0;
      if (seedCount > 0) {
        effective = Math.min(effective, Math.floor(compStock / seedCount));
      } else {
        effective = 0;
        break;
      }
    }
    product.stock = Number.isFinite(effective) ? effective : 0;
  }

  return product as ProductWithTranslations;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const product = await getProduct(slug, locale);

  if (!product) return {};

  const translation = product.product_translations[0];
  const siteUrl = "https://sementesdecolecao.com";
  const localePrefix = locale === "pt" ? "" : `/${locale}`;
  const productUrl = `${siteUrl}${localePrefix}/produto/${slug}`;
  const productImage = product.images?.[0];

  return {
    title: translation?.name,
    description: translation?.description,
    alternates: {
      canonical: productUrl,
      languages: {
        "pt-BR": `${siteUrl}/produto/${slug}`,
        en: `${siteUrl}/en/produto/${slug}`,
        es: `${siteUrl}/es/produto/${slug}`,
      },
    },
    openGraph: {
      title: translation?.name,
      description: translation?.description,
      url: productUrl,
      type: "website",
      images: productImage
        ? [
            {
              url: productImage,
              width: 800,
              height: 800,
              alt: translation?.name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: translation?.name,
      description: translation?.description,
      images: productImage ? [productImage] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const product = await getProduct(slug, locale);

  if (!product) notFound();

  // For bundles, compute effective stock from component stocks
  if (product.product_type === "bundle" && product.bundle_components.length > 0) {
    const effectiveStock = Math.floor(
      Math.min(
        ...product.bundle_components.map((c) =>
          (c.products?.stock ?? 0) / c.seed_count
        )
      )
    );
    product.stock = effectiveStock;
  }

  const translation = product.product_translations[0];
  const lowestVariant = product.product_variants
    .filter((v) => product.stock >= v.seed_count)
    .sort((a, b) => a.price_cents - b.price_cents)[0];

  // Fetch approved reviews
  const supabase = createServerClient();
  const { data: reviewsData } = await supabase
    .from("product_reviews")
    .select("id, author_name, rating, title, body, created_at")
    .eq("product_id", product.id)
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(50);
  const reviews: PublicReview[] = (reviewsData as PublicReview[] | null) ?? [];
  const aggregate = computeAggregate(reviews);

  const strainScienceCardEnabled = await getStrainScienceCardEnabled();

  const jsonLd = (
    <>
      <ProductJsonLd
        name={translation?.name ?? slug}
        description={translation?.description ?? ""}
        image={product.images?.[0]}
        sku={product.specimen_code ?? product.id}
        brand={product.seed_banks?.seed_bank_translations?.[0]?.name}
        priceCents={lowestVariant?.price_cents ?? 0}
        inStock={!!lowestVariant}
        slug={slug}
        locale={locale}
        aggregateRating={
          aggregate.count > 0
            ? { ratingValue: aggregate.average, reviewCount: aggregate.count }
            : undefined
        }
        reviews={reviews.slice(0, 10).map((r) => ({
          author: r.author_name,
          rating: r.rating,
          title: r.title ?? undefined,
          body: r.body ?? undefined,
          datePublished: r.created_at,
        }))}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Loja", url: `/${locale === "pt" ? "" : locale + "/"}loja` },
          { name: translation?.name ?? slug, url: `/${locale === "pt" ? "" : locale + "/"}produto/${slug}` },
        ]}
        locale={locale}
      />
    </>
  );

  const reviewsSection = (
    <ProductReviewsSection
      reviews={reviews}
      aggregate={aggregate}
      locale={locale}
    />
  );

  if (product.is_featured && product.hero_video_url && product.hero_frame_count) {
    const heroFrames = generateFramePaths(
      product.hero_video_url,
      product.hero_frame_count,
      ".webp"
    );
    // Derive the low-res (LQIP) tier by pointing at the sibling `frames-lq/`
    // folder. Generated by `scripts/generate-frames-lq.ts`.
    const lqPrefix = product.hero_video_url.replace("/frames/", "/frames-lq/");
    const heroFramesLq =
      lqPrefix !== product.hero_video_url
        ? generateFramePaths(lqPrefix, product.hero_frame_count, ".webp")
        : undefined;
    return (
      <>
        {jsonLd}
        <FeaturedProductLanding
          product={{ ...product, hero_frames: heroFrames, hero_frames_lq: heroFramesLq }}
        />
        <div className="mx-auto max-w-5xl px-4 py-12">{reviewsSection}</div>
      </>
    );
  }

  return (
    <>
      {jsonLd}
      <ProductDetail
        product={product}
        reviewAggregate={{ average: aggregate.average, count: aggregate.count }}
        strainScienceCardEnabled={strainScienceCardEnabled}
      />
      <div className="mx-auto max-w-5xl px-4 py-12">{reviewsSection}</div>
    </>
  );
}
