import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { createServerClient } from "@/lib/supabase/server";
import { applyBundleEffectiveStock } from "@/lib/bundle-stock";
import { RuledDivider } from "@/components/product/ruled-divider";
import { LineShadowHeading } from "@/components/line-shadow-heading";
import { ShopContent } from "./shop-content";

// ISR: revalidate every hour. Reduces Supabase egress massively when shop is
// hit by many visitors. Admin mutations should call revalidatePath("/loja").
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shop");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ShopPage() {
  const locale = await getLocale();
  const t = await getTranslations("shop");
  const supabase = createServerClient();

  const [{ data: products }, { data: categories }, { data: seedBanks }, { data: terpenes }, { data: reviewRows }, { data: orderItemRows }] =
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
        .from("product_reviews")
        .select("product_id, rating")
        .eq("approved", true),
      supabase
        .from("order_items")
        .select("product_id, quantity, orders!inner(status)")
        .in("orders.status", ["approved", "shipped", "delivered"]),
    ]);

  // Aggregate review ratings per product_id
  const reviewAggregates: Record<string, { average: number; count: number }> = {};
  for (const row of (reviewRows ?? []) as { product_id: string; rating: number }[]) {
    const agg = reviewAggregates[row.product_id] ?? { average: 0, count: 0 };
    const newCount = agg.count + 1;
    const newAverage = (agg.average * agg.count + row.rating) / newCount;
    reviewAggregates[row.product_id] = { average: newAverage, count: newCount };
  }

  // Aggregate sold quantity per product for popularity sort (paid orders only)
  const salesMap: Record<string, number> = {};
  for (const row of (orderItemRows ?? []) as { product_id: string; quantity: number }[]) {
    salesMap[row.product_id] = (salesMap[row.product_id] ?? 0) + row.quantity;
  }

  // Compute effective stock for bundle products
  // (bundle.stock is always 0 — real availability derives from component stocks)
  await applyBundleEffectiveStock(
    supabase,
    (products ?? []) as unknown as { id: string; product_type?: string | null; stock?: number | null }[]
  );

  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* ─── Page Header ─── */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold uppercase tracking-[0.1em] md:text-4xl">
            <LineShadowHeading>{t("title")}</LineShadowHeading>
          </h1>
          <RuledDivider variant="ornamental" className="mt-3" />
        </div>

        <ShopContent
          products={products ?? []}
          categories={categories ?? []}
          seedBanks={seedBanks ?? []}
          terpenes={terpenes ?? []}
          reviewAggregates={reviewAggregates}
          salesMap={salesMap}
        />
      </div>
    </section>
  );
}
