"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SiInstagram } from "@icons-pack/react-simple-icons";
import { useLocale, useTranslations } from "next-intl";
import { RuledDivider } from "@/components/product/ruled-divider";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BrandLogo } from "@/components/brand-logo";

export function SiteFooter() {
  const locale = useLocale();
  const t = useTranslations("common");
  const ft = useTranslations("footer");
  const pathname = usePathname();
  const year = new Date().getFullYear();

  if (pathname.includes("/admin")) return null;

  return (
    <footer className="relative border-t border-white/10 bg-bark text-white pb-44 md:pb-16">
      {/* Dot-grid texture overlay */}
      <DotPattern width={12} height={12} cr={0.5} className="text-foreground opacity-[0.025]" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link
              href={`/${locale}`}
              className="inline-block transition-opacity hover:opacity-80"
            >
              <BrandLogo
                width={180}
                height={70}
                className="h-10 w-auto brightness-0 invert"
                textClassName="text-xl text-white"
              />
            </Link>
            <p className="text-sm text-white/85">{ft("tagline")}</p>
          </div>

          {/* Navigation */}
          <div className="flex flex-col gap-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-white">
              {ft("navigation")}
            </p>
            <nav className="flex flex-col gap-2">
              <Link
                href={`/${locale}`}
                className="font-mono text-xs uppercase tracking-wide text-white/90 transition-colors hover:text-white"
              >
                {t("home")}
              </Link>
              <Link
                href={`/${locale}/loja`}
                className="font-mono text-xs uppercase tracking-wide text-white/90 transition-colors hover:text-white"
              >
                {ft("shop")}
              </Link>
              <Link
                href={`/${locale}/conta`}
                className="font-mono text-xs uppercase tracking-wide text-white/90 transition-colors hover:text-white"
              >
                {t("account")}
              </Link>
            </nav>
          </div>

          {/* Customer Service */}
          <div className="flex flex-col gap-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-white">
              {ft("info")}
            </p>
            <nav className="flex flex-col gap-2">
              <Link
                href={`/${locale}/meus-pedidos`}
                className="font-mono text-xs uppercase tracking-wide text-white/90 transition-colors hover:text-white"
              >
                {t("myOrders")}
              </Link>
              <Link
                href={`/${locale}/meus-pedidos/buscar`}
                className="font-mono text-xs uppercase tracking-wide text-white/90 transition-colors hover:text-white"
              >
                {ft("trackOrder")}
              </Link>
            </nav>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-white">
              {ft("payment")}
            </p>
            <p className="font-mono text-xs text-white/85">{ft("paymentInfo")}</p>
            <p className="font-mono text-xs text-white/85">{ft("shippingInfo")}</p>
          </div>
        </div>

        {/* Legal disclaimer */}
        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-white/80">
            {ft("disclaimerTitle")}
          </p>
          <p className="mt-3 text-[11px] leading-relaxed text-white/60">
            {ft("disclaimer")}
          </p>
        </div>

        {/* Industrial footer bar */}
        <div className="mt-10">
          <RuledDivider variant="ornamental" className="opacity-20" />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.25em] text-white/75">
              SEMENTES DE COLECAO
            </span>
            <Link
              href="https://instagram.com/sementesdecolecao"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram do Banco de Sementes"
              className="inline-flex items-center gap-1 rounded-full border border-white/30 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/90 transition-colors hover:border-white/50 hover:text-white"
            >
              <SiInstagram className="size-3" />
              @sementesdecolecao.com
            </Link>
            <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-white/75">
              &copy; {year} {t("brand")}
            </span>
            <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-white/75">
              desenvolvido por{" "}
              <Link
                href="https://instagram.com/vert.vision"
                target="_blank"
                rel="noreferrer"
                className="group relative inline-flex items-baseline transition-colors hover:text-white"
              >
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8f135] transition-colors group-hover:text-[#d9ff50]">
                  @VERT.VISION
                </span>
                <img
                  src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzdlaWRxeDRpbzVwNjZkcjYwN2pveGk3YmVxZnllYzczdThzcjEycCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/d3mlE7uhX8KFgEmY/giphy.gif"
                  alt="Preview animado de vert.vision"
                  className="pointer-events-none absolute bottom-full left-1/2 mb-2 h-36 w-36 -translate-x-1/2 rounded-lg border border-white/20 object-cover opacity-0 shadow-xl transition-all duration-200 group-hover:opacity-100"
                />
              </Link>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
