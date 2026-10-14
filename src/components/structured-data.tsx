import { getBrandingSettings, toAbsoluteUrl } from "@/lib/branding";

const SITE_URL = "https://sementesdecolecao.com";

export async function OrganizationJsonLd() {
  const branding = await getBrandingSettings();
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SementesDeColecao.com",
    url: SITE_URL,
    logo: toAbsoluteUrl(branding.ogImageUrl),
    description:
      "Curadoria premium de sementes raras de coleção. Genéticas verificadas, perfil terpênico detalhado, envio discreto mundial.",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["Portuguese", "English", "Spanish"],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function WebSiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SementesDeColecao.com",
    url: SITE_URL,
    description:
      "Loja premium de sementes raras de coleção. Curadoria botânica para colecionadores exigentes.",
    inLanguage: ["pt-BR", "en", "es"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/loja?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function ProductJsonLd({
  name,
  description,
  image,
  sku,
  brand,
  priceCents,
  inStock,
  slug,
  locale,
  aggregateRating,
  reviews,
}: {
  name: string;
  description: string;
  image?: string;
  sku: string;
  brand?: string;
  priceCents: number;
  inStock: boolean;
  slug: string;
  locale: string;
  aggregateRating?: { ratingValue: number; reviewCount: number };
  reviews?: Array<{
    author: string;
    rating: number;
    title?: string;
    body?: string;
    datePublished: string;
  }>;
}) {
  const localePrefix = locale === "pt" ? "" : `/${locale}`;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    sku,
    url: `${SITE_URL}${localePrefix}/produto/${slug}`,
    image: image || `${SITE_URL}/images/opengraph-semente1.png`,
    offers: {
      "@type": "Offer",
      price: (priceCents / 100).toFixed(2),
      priceCurrency: "BRL",
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${SITE_URL}${localePrefix}/produto/${slug}`,
      seller: {
        "@type": "Organization",
        name: "SementesDeColecao.com",
      },
    },
  };

  if (brand) {
    data.brand = {
      "@type": "Brand",
      name: brand,
    };
  }

  if (aggregateRating && aggregateRating.reviewCount > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: aggregateRating.ratingValue.toFixed(1),
      reviewCount: aggregateRating.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (reviews && reviews.length > 0) {
    data.review = reviews.map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      ...(r.title ? { name: r.title } : {}),
      ...(r.body ? { reviewBody: r.body } : {}),
      datePublished: r.datePublished,
    }));
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
  locale,
}: {
  items: { name: string; url: string }[];
  locale: string;
}) {
  const localePrefix = locale === "pt" ? "" : `/${locale}`;

  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Início",
        item: `${SITE_URL}${localePrefix}`,
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: item.name,
        item: `${SITE_URL}${item.url}`,
      })),
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function FaqJsonLd({ items }: { items: { question: string; answer: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
