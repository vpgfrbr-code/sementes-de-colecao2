import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const supabase = createServerClient();

  const baseSelect = `id, slug, price_cents, shipping_cents, stock, images, active, category_id,
       seed_type, flowering_weeks_min, flowering_weeks_max, thc_min, thc_max, cbd_min, cbd_max, genetics,
       parent_mother, parent_father, real_photos, show_real_photos,
       seed_bank_id, flavors,
       is_featured, featured_order, on_sale, discount_type, discount_value, sale_ends_at, variant_discounts_enabled,
       created_at,
       product_translations(locale, name, description),
       product_variants(id, slug, seed_count, price_cents, shipping_cents, stock, active, on_sale, discount_type, discount_value, sale_ends_at),
       product_terpenes(id, terpene_id, is_dominant, terpenes(id, slug, name, aroma, color))`;

  // Try full query with bundle columns (requires migration 042)
  const fullResult = await supabase
    .from("products")
    .select(`${baseSelect}, product_type, bundle_components!bundle_components_bundle_product_id_fkey(id, component_product_id, seed_count, products!bundle_components_component_product_id_fkey(id, slug, product_translations(locale, name)))`)
    .order("created_at", { ascending: false });

  // Fallback: migration 042 not yet applied — query without bundle columns
  if (fullResult.error) {
    const fallbackResult = await supabase
      .from("products")
      .select(baseSelect)
      .order("created_at", { ascending: false });
    if (fallbackResult.error) {
      return NextResponse.json({ error: fallbackResult.error.message }, { status: 500 });
    }
    return NextResponse.json(fallbackResult.data);
  }

  return NextResponse.json(fullResult.data);
}

export async function POST(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  let body: {
    slug: string;
    product_type?: string;
    price_cents: number;
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
    translations: { locale: string; name: string; description: string }[];
    variants?: {
      slug: string;
      seed_count: number;
      price_cents: number;
      stock?: number;
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
    specimen_code?: string | null;
    bundle_components?: { component_product_id: string; seed_count: number }[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.slug || !body.slug.trim()) {
    return NextResponse.json(
      { error: "Informe um slug para o produto.", code: "MISSING_SLUG" },
      { status: 400 }
    );
  }
  if (body.price_cents == null || body.price_cents <= 0) {
    return NextResponse.json(
      { error: "Informe um preço maior que zero.", code: "MISSING_PRICE" },
      { status: 400 }
    );
  }
  const ptTranslation = body.translations?.find((t) => t.locale === "pt");
  if (!ptTranslation || !ptTranslation.name?.trim() || ptTranslation.name.trim().length < 2) {
    return NextResponse.json(
      {
        error: "Informe o nome do produto (em português).",
        code: "MISSING_NAME",
      },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const isBundle = body.product_type === "bundle";

  // Create product
  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      slug: body.slug,
      product_type: body.product_type ?? "standard",
      price_cents: body.price_cents,
      shipping_cents: body.shipping_cents ?? 0,
      // Bundles always have stock=0; real availability derives from components
      stock: isBundle ? 0 : (body.stock ?? 0),
      images: body.images ?? [],
      active: body.active ?? true,
      category_id: body.category_id ?? null,
      seed_type: body.seed_type ?? null,
      flowering_weeks_min: body.flowering_weeks_min ?? null,
      flowering_weeks_max: body.flowering_weeks_max ?? null,
      thc_min: body.thc_min ?? null,
      thc_max: body.thc_max ?? null,
      cbd_min: body.cbd_min ?? null,
      cbd_max: body.cbd_max ?? null,
      genetics: body.genetics ?? null,
      seed_bank_id: body.seed_bank_id ?? null,
      parent_mother: body.parent_mother ?? null,
      parent_father: body.parent_father ?? null,
      real_photos: body.real_photos ?? [],
      show_real_photos: body.show_real_photos ?? false,
      is_featured: body.is_featured ?? false,
      on_sale: body.on_sale ?? false,
      discount_type: body.discount_type ?? null,
      discount_value: body.discount_value ?? 0,
      sale_ends_at: body.sale_ends_at ?? null,
      variant_discounts_enabled: body.variant_discounts_enabled ?? false,
      specimen_code: body.specimen_code?.trim() || null,
      flavors: body.flavors ?? [],
    })
    .select("id")
    .single();

  if (productError || !product) {
    return NextResponse.json(
      { error: productError?.message ?? "Failed to create product" },
      { status: 500 }
    );
  }

  // Insert translations
  const { error: transError } = await supabase
    .from("product_translations")
    .insert(
      body.translations.map((t) => ({
        product_id: product.id,
        locale: t.locale,
        name: t.name,
        description: t.description,
      }))
    );

  if (transError) {
    console.error("[admin/products POST] translation insert failed:", transError);
    // Roll back the parent product so the admin can retry cleanly.
    await supabase.from("products").delete().eq("id", product.id);
    return NextResponse.json(
      { error: `Falha ao salvar tradu\u00e7\u00f5es: ${transError.message}` },
      { status: 500 }
    );
  }

  // Insert variants
  if (body.variants?.length) {
    const { error: varError } = await supabase
      .from("product_variants")
      .insert(
        body.variants.map((v) => ({
          product_id: product.id,
          slug: v.slug,
          seed_count: v.seed_count,
          price_cents: v.price_cents,
          stock: 0,
          active: v.active ?? true,
          on_sale: v.on_sale ?? false,
          discount_type: v.discount_type ?? null,
          discount_value: v.discount_value ?? 0,
          sale_ends_at: v.sale_ends_at ?? null,
        }))
      );

    if (varError) {
      console.error("[admin/products POST] variant insert failed:", varError);
      await supabase.from("products").delete().eq("id", product.id);
      return NextResponse.json(
        { error: `Falha ao salvar variantes: ${varError.message}` },
        { status: 500 }
      );
    }
  }

  // Insert terpenes
  if (body.terpene_ids?.length) {
    const { error: terpError } = await supabase
      .from("product_terpenes")
      .insert(
        body.terpene_ids.map((t) => ({
          product_id: product.id,
          terpene_id: t.terpene_id,
          is_dominant: t.is_dominant ?? false,
        }))
      );
    if (terpError) {
      // Non-fatal: terpenes are decorative, log but don't roll back.
      console.error("[admin/products POST] terpene insert failed:", terpError);
    }
  }

  // Insert bundle components
  if (isBundle && body.bundle_components?.length) {
    const { error: compError } = await supabase
      .from("bundle_components")
      .insert(
        body.bundle_components.map((c) => ({
          bundle_product_id: product.id,
          component_product_id: c.component_product_id,
          seed_count: c.seed_count,
        }))
      );
    if (compError) {
      console.error("[admin/products POST] bundle components insert failed:", compError);
      await supabase.from("products").delete().eq("id", product.id);
      return NextResponse.json(
        { error: `Falha ao salvar componentes do bundle: ${compError.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ id: product.id }, { status: 201 });
}
