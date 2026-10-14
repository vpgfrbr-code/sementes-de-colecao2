import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = "https://sementesdecolecao.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/api",
          "/api/*",
          "/conta",
          "/conta/*",
          "/checkout",
          "/checkout/*",
          "/pedido",
          "/pedido/*",
          "/meus-pedidos",
          "/meus-pedidos/*",
          "/sign-in",
          "/sign-in/*",
          "/sign-up",
          "/sign-up/*",
          "/en/admin/*",
          "/en/conta/*",
          "/en/checkout/*",
          "/en/pedido/*",
          "/en/meus-pedidos/*",
          "/en/sign-in/*",
          "/en/sign-up/*",
          "/es/admin/*",
          "/es/conta/*",
          "/es/checkout/*",
          "/es/pedido/*",
          "/es/meus-pedidos/*",
          "/es/sign-in/*",
          "/es/sign-up/*",
        ],
      },
      // Explicitly allow AI crawlers
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
