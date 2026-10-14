"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  FadeUp,
  StaggerGroup,
  StaggerItem,
} from "@/components/motion";
import { AnimatedHeading } from "@/components/animated-heading";
import { RuledDivider } from "@/components/product/ruled-divider";
import { ProductCard } from "@/components/product/product-card";
import SaleSection5 from "@/components/sale-section-5";
import { FlashSaleCarousel } from "@/components/flash-sale-carousel";

type ProductCardProduct = {
  id: string;
  slug: string;
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

type FlashSale = {
  id: string;
  active: boolean;
  coupon_id: string | null;
  discount_type: string | null;
  discount_value: number | null;
  ends_at: string;
  flash_sale_translations: {
    title: string;
    subtitle: string;
    button_text: string;
  }[];
  flash_sale_items: {
    product_id: string | null;
    category_id: string | null;
  }[];
  coupons?: { code: string } | null;
};

type DeferredPayload = {
  featuredProducts: (ProductCardProduct & { category_id?: string | null })[];
  flashSales: FlashSale[];
};

type IdleRequester = (cb: () => void, opts?: { timeout: number }) => number;

export function HomepageDeferredSections() {
  const locale = useLocale();
  const st = useTranslations("shop");
  const mt = useTranslations("metadata");
  const fst = useTranslations("flashSale");
  const [data, setData] = useState<DeferredPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = () => {
      fetch(`/api/homepage/deferred?locale=${locale}`, {
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((json: DeferredPayload | null) => {
          if (cancelled || !json) return;
          setData(json);
        })
        .catch(() => {
          // Silently ignore; these are enhancement sections.
        });
    };

    const win = window as Window & { requestIdleCallback?: IdleRequester };
    let idleHandle: number | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    if (typeof win.requestIdleCallback === "function") {
      idleHandle = win.requestIdleCallback(fetchData, { timeout: 2500 });
    } else {
      timeoutHandle = setTimeout(fetchData, 1200);
    }

    return () => {
      cancelled = true;
      if (idleHandle !== undefined) {
        const cancel = (window as Window & {
          cancelIdleCallback?: (h: number) => void;
        }).cancelIdleCallback;
        cancel?.(idleHandle);
      }
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };
  }, [locale]);

  if (!data) return null;

  const flashSale = data.flashSales[0];
  const flashTrans = flashSale?.flash_sale_translations[0];

  const categoryIds = flashSale
    ? new Set(
        flashSale.flash_sale_items
          .filter((i) => i.category_id)
          .map((i) => i.category_id as string)
      )
    : new Set<string>();
  const directProductIds = flashSale
    ? new Set(
        flashSale.flash_sale_items
          .filter((i) => i.product_id)
          .map((i) => i.product_id as string)
      )
    : new Set<string>();

  const saleProducts = data.featuredProducts.filter(
    (p) =>
      directProductIds.has(p.id) ||
      (p.category_id ? categoryIds.has(p.category_id) : false)
  );

  const catIdList = [...categoryIds].filter(Boolean).join(",");
  const buttonHref = catIdList
    ? `/${locale}/loja?cat=${catIdList}`
    : `/${locale}/loja`;

  return (
    <>
      {/* Flash Sale */}
      {flashSale && flashTrans && (
        <>
          <SaleSection5
            title={flashTrans.title}
            subtitle={flashTrans.subtitle}
            couponCode={flashSale.coupons?.code}
            endDate={new Date(flashSale.ends_at)}
            labels={{
              days: fst("days"),
              hours: fst("hours"),
              minutes: fst("minutes"),
              seconds: fst("seconds"),
            }}
            unlockLabel={fst("unlock")}
            copiedLabel={fst("copied")}
            couponLabel={fst("coupon")}
          />
          {saleProducts.length > 0 && (
            <FlashSaleCarousel
              title={fst("sectionTitle")}
              products={saleProducts as ProductCardProduct[]}
              viewAllHref={buttonHref}
              viewAllLabel={st("viewAll")}
            />
          )}
        </>
      )}

      {/* Featured */}
      {data.featuredProducts.length > 0 && (
        <section className="py-12 md:py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <FadeUp>
              <div className="mb-3 flex items-end justify-between">
                <AnimatedHeading
                  as="h2"
                  animation="slideUp"
                  by="word"
                  className="font-display text-3xl font-bold tracking-tight md:text-4xl"
                >
                  {mt("featuredTitle")}
                </AnimatedHeading>
                <Link href={`/${locale}/loja`} aria-label={st("viewAll")}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-none border border-foreground/20 transition-colors hover:bg-foreground/5 sm:hidden">
                    <ChevronRight className="h-4 w-4 text-foreground/60" />
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden rounded-full font-mono text-[11px] uppercase tracking-[0.1em] sm:inline-flex"
                  >
                    {st("viewAll")}
                  </Button>
                </Link>
              </div>
              <RuledDivider variant="ornamental" className="mb-10" />
            </FadeUp>
            <StaggerGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.featuredProducts.map((product, i) => (
                <StaggerItem key={product.id}>
                  <ProductCard product={product} featured priority={i < 4} />
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>
      )}
    </>
  );
}
