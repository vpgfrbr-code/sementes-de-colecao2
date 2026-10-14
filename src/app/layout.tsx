import type { Metadata } from "next";
import { getBrandingSettings, toAbsoluteUrl } from "@/lib/branding";

const SITE_URL = "https://sementesdecolecao.com";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingSettings();
  const ogAbs = toAbsoluteUrl(branding.ogImageUrl);
  const faviconAbs = toAbsoluteUrl(branding.faviconUrl);

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default:
        "SementesDeColecao.com — Sementes Raras de Coleção | Curadoria Botânica Premium",
      template: "%s | SementesDeColecao.com",
    },
    description:
      "Loja premium de sementes raras de coleção. Genéticas verificadas, perfil terpênico detalhado, envio discreto mundial e pagamento instantâneo via PIX. Curadoria botânica para colecionadores exigentes.",
    keywords: [
      "sementes de coleção",
      "sementes raras",
      "comprar sementes",
      "sementes feminizadas",
      "sementes automáticas",
      "sementes regulares",
      "banco de sementes",
      "curadoria botânica",
      "genéticas raras",
      "terpenos",
      "perfil terpênico",
      "fenótipos raros",
      "sementes landrace",
      "genética verificada",
      "linhagem botânica",
      "envio discreto",
      "pagamento PIX",
      "colecionador botânico",
      "sementes premium",
      "collection seeds",
      "rare seeds",
      "feminized seeds",
      "autoflower seeds",
      "seed bank",
      "botanical curation",
      "rare genetics",
      "terpene profile",
      "semillas de colección",
      "semillas raras",
    ],
    authors: [{ name: "SementesDeColecao.com", url: SITE_URL }],
    creator: "SementesDeColecao.com",
    publisher: "SementesDeColecao.com",
    category: "e-commerce",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: SITE_URL,
      languages: {
        "pt-BR": SITE_URL,
        en: `${SITE_URL}/en`,
        es: `${SITE_URL}/es`,
      },
    },
    openGraph: {
      siteName: "SementesDeColecao.com",
      type: "website",
      locale: "pt_BR",
      alternateLocale: ["en_US", "es_ES"],
      url: SITE_URL,
      title:
        "SementesDeColecao.com — Sementes Raras de Coleção | Curadoria Botânica Premium",
      description:
        "Curadoria premium de sementes raras para colecionadores. Genéticas verificadas, perfil terpênico, envio discreto mundial. Pagamento via PIX.",
      images: [
        {
          url: ogAbs,
          width: 1200,
          height: 630,
          alt: branding.brandName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title:
        "SementesDeColecao.com — Sementes Raras de Coleção",
      description:
        "Curadoria premium de sementes raras. Genéticas verificadas, terpenos, envio discreto mundial.",
      images: [ogAbs],
    },
    icons: [
      {
        url: faviconAbs,
        href: faviconAbs,
      },
    ],
  };
}

// Since we have a root `not-found.tsx`, the root layout must pass children
// through. The <html>/<body> tags live in [locale]/layout.tsx instead.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
