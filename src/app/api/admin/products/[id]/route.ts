import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";
import type { Database } from "@/lib/supabase/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;
  const supabase = createServerClient();

  const baseSelect = `id, slug, price_cents, shipping_cents, stock, images, active, category_id,
       seed_type, flowering_weeks_min, flowering_weeks_max, thc_min, thc_max, cbd_min, cbd_max, genetics,
       parent_mother, parent_father, real_photos, show_real_photos,
       seed_bank_id, flavors,
       is_featured, featured_order, on_sale, discount_type, discount_value, sale_ends_at, variant_discounts_enabled,
       hero_video_url, hero_poster_url, hero_frame_count, specimen_code,
       created_at,
       product_translations(id, locale, name, description),
       product_variants(id, slug, seed_count, price_cents, stock, active, on_sale, discount_type, discount_value, sale_ends_at),
       product_terpenes(id, terpene_id, is_dominant, terpenes(id, slug, name, aroma, color))`;

  // Try with bundle columns first (requires migration 042)
  const fullResult = await supabase
    .from("products")
    .select(
      `${baseSelect}, product_type, bundle_components!bundle_components_bundle_product_id_fkey(id, component_product_id, seed_count, products!bundle_components_component_product_id_fkey(id, slug, product_translations(locale, name)))`
    )
    .eq("id", id)
    .maybeSingle();

  let data: typeof fullResult.data = fullResult.data;
  let error = fullResult.error;

  // Fallback if migration 042 isn't applied yet
  if (
    error &&
    /product_type|bundle_components/i.test(error.message)
  ) {
    const fallback = await supabase
      .from("products")
      .select(baseSelect)
      .eq("id", id)
      .maybeSingle();
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error) {
    console.error("[admin/products GET] supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    slug?: string;
    product_type?: string;
    price_cents?: number;
    shipping_cents?: number;
    stock?: number;
    images?: string[];
    active?: boolean;
    category_id?: string | null;
    seed_type?: string | null;
    flowering_weeks_min?: number | null;
    flowering_weeks_max?: number | null;
    thc_min?: number | null;
    thc_max?: number | null;
    cbd_min?: number | null;
    cbd_max?: number | null;
    genetics?: string | null;
    translations?: { locale: string; name: string; description: string }[];
    variants?: {
      id?: string;
      slug: string;
      seed_count: number;
      price_cents: number;
      stock: number;
      active?: boolean;
      on_sale?: boolean;
      discount_type?: string | null;
      discount_value?: number | null;
      sale_ends_at?: string | null;
    }[];
    terpene_ids?: { terpene_id: string; is_dominant?: boolean }[];
    flavors?: string[];
    seed_bank_id?: string | null;
    parent_mother?: string | null;
    parent_father?: string | null;
    real_photos?: string[];
    show_real_photos?: boolean;
    is_featured?: boolean;
    on_sale?: boolean;
    discount_type?: string | null;
    discount_value?: number | null;
    sale_ends_at?: string | null;
    variant_discounts_enabled?: boolean;
    hero_video_url?: string | null;
    hero_poster_url?: string | null;
    hero_frame_count?: number | null;
    specimen_code?: string | null;
    bundle_components?: { component_product_id: string; seed_count: number }[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate canonical PT name when translations are provided
  if (body.translations?.length) {
    const ptTranslation = body.translations.find((t) => t.locale === "pt");
    if (
      !ptTranslation ||
      !ptTranslation.name?.trim() ||
      ptTranslation.name.trim().length < 2
    ) {
      return NextResponse.json(
        {
          error: "Informe o nome do produto (em português).",
          code: "MISSING_NAME",
        },
        { status: 400 }
      );
    }
  }
  if (body.slug !== undefined && !body.slug.trim()) {
    return NextResponse.json(
      { error: "Informe um slug para o produto.", code: "MISSING_SLUG" },
      { status: 400 }
    );
  }
  if (body.price_cents !== undefined && body.price_cents <= 0) {
    return NextResponse.json(
      { error: "Informe um preço maior que zero.", code: "MISSING_PRICE" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Update product fields
  const productUpdate: Record<string, unknown> = {};
  if (body.slug !== undefined) productUpdate.slug = body.slug;
  if (body.product_type !== undefined) productUpdate.product_type = body.product_type;
  if (body.price_cents !== undefined) productUpdate.price_cents = body.price_cents;
  if (body.shipping_cents !== undefined) productUpdate.shipping_cents = body.shipping_cents;
  if (body.stock !== undefined) productUpdate.stock = body.stock;
  if (body.images !== undefined) productUpdate.images = body.images;
  if (body.active !== undefined) productUpdate.active = body.active;
  if (body.category_id !== undefined) productUpdate.category_id = body.category_id;
  if (body.seed_type !== undefined) productUpdate.seed_type = body.seed_type;
  if (body.flowering_weeks_min !== undefined) productUpdate.flowering_weeks_min = body.flowering_weeks_min;
  if (body.flowering_weeks_max !== undefined) productUpdate.flowering_weeks_max = body.flowering_weeks_max;
  if (body.thc_min !== undefined) productUpdate.thc_min = body.thc_min;
  if (body.thc_max !== undefined) productUpdate.thc_max = body.thc_max;
  if (body.cbd_min !== undefined) productUpdate.cbd_min = body.cbd_min;
  if (body.cbd_max !== undefined) productUpdate.cbd_max = body.cbd_max;
  if (body.genetics !== undefined) productUpdate.genetics = body.genetics;
  if (body.seed_bank_id !== undefined) productUpdate.seed_bank_id = body.seed_bank_id;
  if (body.parent_mother !== undefined) productUpdate.parent_mother = body.parent_mother;
  if (body.parent_father !== undefined) productUpdate.parent_father = body.parent_father;
  if (body.real_photos !== undefined) productUpdate.real_photos = body.real_photos;
  if (body.show_real_photos !== undefined) productUpdate.show_real_photos = body.show_real_photos;
  if (body.is_featured !== undefined) productUpdate.is_featured = body.is_featured;
  if (body.on_sale !== undefined) productUpdate.on_sale = body.on_sale;
  if (body.discount_type !== undefined) productUpdate.discount_type = body.discount_type;
  if (body.discount_value !== undefined) productUpdate.discount_value = body.discount_value;
  if (body.sale_ends_at !== undefined) productUpdate.sale_ends_at = body.sale_ends_at;
  if (body.variant_discounts_enabled !== undefined) productUpdate.variant_discounts_enabled = body.variant_discounts_enabled;
  if (body.hero_video_url !== undefined) productUpdate.hero_video_url = body.hero_video_url;
  if (body.hero_poster_url !== undefined) productUpdate.hero_poster_url = body.hero_poster_url;
  if (body.hero_frame_count !== undefined) productUpdate.hero_frame_count = body.hero_frame_count;
  if (body.specimen_code !== undefined) {
    productUpdate.specimen_code =
      typeof body.specimen_code === "string" && body.specimen_code.trim()
        ? body.specimen_code.trim()
        : null;
  }
  if (body.flavors !== undefined) productUpdate.flavors = body.flavors;

  if (Object.keys(productUpdate).length > 0) {
    const { error } = await supabase
      .from("products")
      .update(productUpdate as Database["public"]["Tables"]["products"]["Update"])
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Upsert translations
  if (body.translations?.length) {
    for (const t of body.translations) {
      await supabase
        .from("product_translations")
        .upsert(
          {
            product_id: id,
            locale: t.locale,
            name: t.name,
            description: t.description,
          },
          { onConflict: "product_id,locale" }
        );
    }
  }

  // Handle variants — upsert existing, insert new
  if (body.variants?.length) {
    for (const v of body.variants) {
      if (v.id) {
        // Stock is unified at products.stock (migration 028); ignore any
        // variant stock value coming from the client.
        await supabase
          .from("product_variants")
          .update({
            slug: v.slug,
            seed_count: v.seed_count,
            price_cents: v.price_cents,
            active: v.active ?? true,
            on_sale: v.on_sale ?? false,
            discount_type: v.discount_type ?? null,
            discount_value: v.discount_value ?? 0,
            sale_ends_at: v.sale_ends_at ?? null,
          })
          .eq("id", v.id);
      } else {
        await supabase.from("product_variants").insert({
          product_id: id,
          slug: v.slug,
          seed_count: v.seed_count,
          price_cents: v.price_cents,
          stock: 0,
          active: v.active ?? true,
          on_sale: v.on_sale ?? false,
          discount_type: v.discount_type ?? null,
          discount_value: v.discount_value ?? 0,
          sale_ends_at: v.sale_ends_at ?? null,
        });
      }
    }
  }

  // Sync terpenes — delete all + re-insert
  if (body.terpene_ids !== undefined) {
    await supabase.from("product_terpenes").delete().eq("product_id", id);
    if (body.terpene_ids.length) {
      await supabase.from("product_terpenes").insert(
        body.terpene_ids.map((t) => ({
          product_id: id,
          terpene_id: t.terpene_id,
          is_dominant: t.is_dominant ?? false,
        }))
      );
    }
  }

  // Sync bundle components — delete all + re-insert
  if (body.bundle_components !== undefined) {
    await supabase.from("bundle_components").delete().eq("bundle_product_id", id);
    if (body.bundle_components.length) {
      await supabase.from("bundle_components").insert(
        body.bundle_components.map((c) => ({
          bundle_product_id: id,
          component_product_id: c.component_product_id,
          seed_count: c.seed_count,
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

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
