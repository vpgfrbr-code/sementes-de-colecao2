import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET() {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const supabase = createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("flash_sales")
    .select(
      `id, active, coupon_id, discount_type, discount_value, ends_at, created_at,
        flash_sale_translations(id, locale, title, subtitle, button_text),
        flash_sale_items(id, product_id, category_id,
          products(id, slug, images, product_translations(locale, name)),
          categories(id, slug, category_translations(locale, name))
        ),
        coupons(id, code, type, value)`
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  let body: {
    active?: boolean;
    coupon_id?: string | null;
    discount_type?: string;
    discount_value?: number;
    ends_at: string;
    translations?: { locale: string; title: string; subtitle: string; button_text: string }[];
    items?: { product_id?: string | null; category_id?: string | null }[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.ends_at) {
    return NextResponse.json({ error: "ends_at is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: flashSale, error: fsError } = await (supabase as any)
    .from("flash_sales")
    .insert({
      active: body.active ?? false,
      coupon_id: body.coupon_id ?? null,
      discount_type: body.discount_type ?? "percentage",
      discount_value: body.discount_value ?? 0,
      ends_at: body.ends_at,
    })
    .select("id")
    .single();

  if (fsError || !flashSale) {
    return NextResponse.json({ error: fsError?.message ?? "Insert failed" }, { status: 500 });
  }

  // Insert translations
  if (body.translations && body.translations.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: tError } = await (supabase as any).from("flash_sale_translations").insert(
      body.translations.map((t) => ({
        flash_sale_id: flashSale.id,
        locale: t.locale,
        title: t.title,
        subtitle: t.subtitle,
        button_text: t.button_text,
      }))
    );
    if (tError) {
      return NextResponse.json({ error: tError.message }, { status: 500 });
    }
  }

  // Insert items
  if (body.items && body.items.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: iError } = await (supabase as any).from("flash_sale_items").insert(
      body.items.map((item) => ({
        flash_sale_id: flashSale.id,
        product_id: item.product_id ?? null,
        category_id: item.category_id ?? null,
      }))
    );
    if (iError) {
      return NextResponse.json({ error: iError.message }, { status: 500 });
    }
  }

  // If active, sync on_sale to products
  if (body.active) {
    await syncProductSaleFlags(supabase, flashSale.id, true);
  }

  return NextResponse.json({ id: flashSale.id }, { status: 201 });
}

/**
 * Resolves all product IDs participating in a flash sale (direct + via categories),
 * then sets or clears on_sale flags on those products.
 */
async function syncProductSaleFlags(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  flashSaleId: string,
  activate: boolean
) {
  // Get the flash sale details
  const { data: fs } = await supabase
    .from("flash_sales")
    .select("discount_type, discount_value, ends_at")
    .eq("id", flashSaleId)
    .single();

  if (!fs) return;

  // Get all items
  const { data: items } = await supabase
    .from("flash_sale_items")
    .select("product_id, category_id")
    .eq("flash_sale_id", flashSaleId);

  if (!items || items.length === 0) return;

  const directProductIds = (items as { product_id: string | null; category_id: string | null }[])
    .filter((i) => i.product_id)
    .map((i) => i.product_id!);

  const categoryIds = (items as { product_id: string | null; category_id: string | null }[])
    .filter((i) => i.category_id)
    .map((i) => i.category_id!);

  // Get products from categories
  let categoryProductIds: string[] = [];
  if (categoryIds.length > 0) {
    const { data: catProducts } = await supabase
      .from("products")
      .select("id")
      .in("category_id", categoryIds)
      .eq("active", true);

    categoryProductIds = (catProducts ?? []).map((p: { id: string }) => p.id);
  }

  // Combine and dedupe
  const allProductIds = [...new Set([...directProductIds, ...categoryProductIds])];
  if (allProductIds.length === 0) return;

  if (activate) {
    await supabase
      .from("products")
      .update({
        on_sale: true,
        discount_type: fs.discount_type,
        discount_value: fs.discount_value,
        sale_ends_at: fs.ends_at,
      })
      .in("id", allProductIds);
  } else {
    await supabase
      .from("products")
      .update({
        on_sale: false,
        discount_type: null,
        discount_value: 0,
        sale_ends_at: null,
      })
      .in("id", allProductIds);
  }
}
