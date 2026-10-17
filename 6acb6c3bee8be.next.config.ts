import type { NextConfig } from "next";
import { randomBytes } from "crypto";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Security headers applied to every response. Deliberately omits CSP for now —
// CSP requires nonce-based script-src to work with Next.js App Router and
// Clerk widgets without breaking, and is tracked as a follow-up.
const SECURITY_HEADERS = [
  // Force HTTPS for 2 years; include subdomains; allow HSTS preload submission.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Block iframing entirely (clickjacking). Modern browsers also honor CSP
  // frame-ancestors, but this header covers legacy clients.
  { key: "X-Frame-Options", value: "DENY" },
  // Disable MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send full referrer to same-origin, only origin to cross-origin HTTPS.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful browser APIs we don't use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Allow speculative DNS prefetch (perf, no security impact).
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // Strip the X-Powered-By header (defense in depth — Next.js 14+ already
  // omits it by default, but make the intent explicit).
  poweredByHeader: false,
  // Use a random build ID per build instead of the default git commit hash,
  // so the BUILD_ID exposed in client bundles doesn't leak VCS info.
  generateBuildId: async () => randomBytes(16).toString("hex"),
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    // Storefront max container is ~1280px and product cards rarely exceed
    // 33vw on desktop / 50vw on tablet / 100vw on mobile. Trimming the
    // default device + image sizes (which include 1920/2048/3840) cuts the
    // generated `srcset` candidates roughly in half — less work for the
    // optimizer + smaller HTML payload + better cache hit ratio at the edge.
    deviceSizes: [640, 750, 828, 1080, 1280, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mishxlvucqoynqjmqile.supabase.co",
      },
      // Cloudflare R2 default public URL (when "Public Access" is enabled in
      // the bucket settings). The hostname is shaped like
      //   pub-<32-hex>.r2.dev
      // so we wildcard the `pub-*.r2.dev` family. If you migrate to a custom
      // domain (e.g. media.sementesdecolecao.com) add another entry here.
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "media.sementesdecolecao.com",
      },
    ],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "motion",
      "motion/react",
      "@icons-pack/react-simple-icons",
      "recharts",
      "embla-carousel-react",
      "embla-carousel-autoplay",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "radix-ui",
      "sonner",
      "vaul",
    ],
  },
  async headers() {
    return [
      // Security headers on every route.
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/videos/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/:path*.(svg|ico|png|jpg|jpeg|webp|avif|woff2)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, immutable" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
