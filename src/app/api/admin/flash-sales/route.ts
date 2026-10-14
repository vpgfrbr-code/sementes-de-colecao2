import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET(_req: NextRequest) {
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
    ends_at?: string;
    translations?: { locale: string; title: string; subtitle: string; button_text: string }[];
    items?: { product_id?: string | null; category_id?: string | null }[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: flashSale, error: insertError } = await (supabase as any)
    .from("flash_sales")
    .insert({
      active: body.active ?? false,
      coupon_id: body.coupon_id ?? null,
      discount_type: body.discount_type ?? "percentage",
      discount_value: body.discount_value ?? 0,
      ends_at: body.ends_at ?? null,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const flashSaleId = flashSale.id;

  if (body.translations && body.translations.length > 0) {
    for (const t of body.translations) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("flash_sale_translations")
        .insert({
          flash_sale_id: flashSaleId,
          locale: t.locale,
          title: t.title,
          subtitle: t.subtitle,
          button_text: t.button_text,
        });
    }
  }

  if (body.items && body.items.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("flash_sale_items").insert(
      body.items.map((item) => ({
        flash_sale_id: flashSaleId,
        product_id: item.product_id ?? null,
        category_id: item.category_id ?? null,
      }))
    );
  }

  return NextResponse.json({ id: flashSaleId }, { status: 201 });
}
