import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const localeParam = searchParams.get("locale");
  const locale = (routing.locales as readonly string[]).includes(localeParam ?? "")
    ? localeParam!
    : routing.defaultLocale;

  const supabase = createServerClient();

  const [{ data: featuredProducts }, { data: flashSales }] = await Promise.all([
    supabase
      .from("products")
      .select(
        `id, slug, images, stock, seed_type, seed_bank_id, category_id,
         on_sale, discount_type, discount_value, sale_ends_at, variant_discounts_enabled,
         product_translations!inner(name, description),
         product_variants(id, seed_count, price_cents, stock, on_sale, discount_type, discount_value, sale_ends_at),
         product_terpenes(terpene_id)`
      )
      .eq("product_translations.locale", locale)
      .eq("active", true)
      .eq("is_featured", true)
      .order("featured_order", { ascending: true })
      .limit(8),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("flash_sales")
      .select(
        `id, active, coupon_id, discount_type, discount_value, ends_at,
         flash_sale_translations!inner(title, subtitle, button_text),
         flash_sale_items(product_id, category_id),
         coupons(code)`
      )
      .eq("active", true)
      .eq("flash_sale_translations.locale", locale)
      .gt("ends_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  return NextResponse.json(
    {
      featuredProducts: featuredProducts ?? [],
      flashSales: flashSales ?? [],
    },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
