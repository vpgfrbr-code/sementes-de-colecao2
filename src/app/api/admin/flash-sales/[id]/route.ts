import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;
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
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;
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
  const { data: current } = await (supabase as any)
    .from("flash_sales")
    .select("active")
    .eq("id", id)
    .single();

  if (!current) {
    return NextResponse.json({ error: "Flash sale not found" }, { status: 404 });
  }

  // Update flash sale fields
  const updates: Record<string, unknown> = {};
  if (body.active !== undefined) updates.active = body.active;
  if (body.coupon_id !== undefined) updates.coupon_id = body.coupon_id;
  if (body.discount_type !== undefined) updates.discount_type = body.discount_type;
  if (body.discount_value !== undefined) updates.discount_value = body.discount_value;
  if (body.ends_at !== undefined) updates.ends_at = body.ends_at;

  if (Object.keys(updates).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("flash_sales")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Update translations (upsert)
  if (body.translations) {
    for (const t of body.translations) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("flash_sale_translations")
        .upsert(
          {
            flash_sale_id: id,
            locale: t.locale,
            title: t.title,
            subtitle: t.subtitle,
            button_text: t.button_text,
          },
          { onConflict: "flash_sale_id,locale" }
        );
    }
  }

  // Update items (delete-all + re-insert)
  if (body.items !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("flash_sale_items")
      .delete()
      .eq("flash_sale_id", id);

    if (body.items.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("flash_sale_items").insert(
        body.items.map((item) => ({
          flash_sale_id: id,
          product_id: item.product_id ?? null,
          category_id: item.category_id ?? null,
        }))
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;
  const supabase = createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("flash_sales").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
