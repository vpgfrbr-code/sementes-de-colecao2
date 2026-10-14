import type { MetadataRoute } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SITE_URL = "https://sementesdecolecao.com";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  let products: { slug: string; updated_at: string | null }[] | null = null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createSupabaseClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from("products")
        .select("slug, updated_at")
        .eq("active", true);
      products = data;
    } catch {
      // Supabase unavailable at build time — generate static pages only
    }
  }

  // Static pages across all locales
  const locales = [
    { prefix: "", hreflang: "pt-BR" },
    { prefix: "/en", hreflang: "en" },
    { prefix: "/es", hreflang: "es" },
  ];

  const staticPages: MetadataRoute.Sitemap = [];

  for (const { prefix } of locales) {
    staticPages.push(
      {
        url: `${SITE_URL}${prefix}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 1.0,
        alternates: {
          languages: {
            "pt-BR": `${SITE_URL}`,
            en: `${SITE_URL}/en`,
            es: `${SITE_URL}/es`,
          },
        },
      },
      {
        url: `${SITE_URL}${prefix}/loja`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.9,
        alternates: {
          languages: {
            "pt-BR": `${SITE_URL}/loja`,
            en: `${SITE_URL}/en/loja`,
            es: `${SITE_URL}/es/loja`,
          },
        },
      }
    );
  }

  // Product pages across all locales
  const productPages: MetadataRoute.Sitemap = [];

  if (products) {
    for (const product of products) {
      for (const { prefix } of locales) {
        productPages.push({
          url: `${SITE_URL}${prefix}/produto/${product.slug}`,
          lastModified: product.updated_at || now,
          changeFrequency: "weekly",
          priority: 0.8,
          alternates: {
            languages: {
              "pt-BR": `${SITE_URL}/produto/${product.slug}`,
              en: `${SITE_URL}/en/produto/${product.slug}`,
              es: `${SITE_URL}/es/produto/${product.slug}`,
            },
          },
        });
      }
    }
  }

  return [...staticPages, ...productPages];
}
