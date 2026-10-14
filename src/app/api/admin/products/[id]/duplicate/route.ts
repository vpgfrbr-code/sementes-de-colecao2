import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;
  const supabase = createServerClient();

  // Load source product with children
  const { data: source, error: sourceError } = await supabase
    .from("products")
    .select(
      `id, slug, price_cents, shipping_cents, stock, images, active, category_id,
       seed_type, flowering_weeks_min, flowering_weeks_max, thc_min, thc_max, cbd_min, cbd_max, genetics,
       parent_mother, parent_father, real_photos, show_real_photos,
       seed_bank_id, flavors,
       is_featured, featured_order, on_sale, discount_type, discount_value, sale_ends_at, variant_discounts_enabled,
       hero_video_url, hero_poster_url, hero_frame_count, specimen_code,
       product_translations(locale, name, description),
       product_variants(slug, seed_count, price_cents, stock, active, on_sale, discount_type, discount_value, sale_ends_at),
       product_terpenes(terpene_id, is_dominant)`
    )
    .eq("id", id)
    .single();

  if (sourceError || !source) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Generate a unique slug based on the source
  const baseSlug = `${source.slug}-copia`;
  let candidateSlug = baseSlug;
  let attempt = 1;
  // Try up to 20 times
  while (attempt < 20) {
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("slug", candidateSlug)
      .maybeSingle();
    if (!existing) break;
    attempt += 1;
    candidateSlug = `${baseSlug}-${attempt}`;
  }

  // Insert the new product (clone), forcing inactive + no featured + no promo
  const insertPayload = {
      slug: candidateSlug,
      price_cents: source.price_cents,
      shipping_cents: source.shipping_cents,
      stock: 0,
      images: source.images ?? [],
      active: false,
      category_id: source.category_id,
      seed_type: source.seed_type,
      flowering_weeks_min: source.flowering_weeks_min,
      flowering_weeks_max: source.flowering_weeks_max,
      thc_min: source.thc_min,
      thc_max: source.thc_max,
      cbd_min: source.cbd_min,
      cbd_max: source.cbd_max,
      genetics: source.genetics,
      parent_mother: source.parent_mother,
      parent_father: source.parent_father,
      real_photos: source.real_photos ?? [],
      show_real_photos: source.show_real_photos,
      seed_bank_id: source.seed_bank_id,
      flavors: source.flavors ?? [],
      is_featured: false,
      featured_order: null,
      on_sale: false,
      discount_type: null,
      discount_value: null,
      sale_ends_at: null,
      variant_discounts_enabled: source.variant_discounts_enabled,
      hero_video_url: source.hero_video_url,
      hero_poster_url: source.hero_poster_url,
      hero_frame_count: source.hero_frame_count,
      specimen_code: null,
  };
  const { data: newProduct, error: insertError } = await supabase
    .from("products")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(insertPayload as any)
    .select("id, slug")
    .single();

  if (insertError || !newProduct) {
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to duplicate" },
      { status: 500 }
    );
  }

  // Clone translations (prepend "[Cópia]" to name)
  if (source.product_translations?.length) {
    await supabase.from("product_translations").insert(
      source.product_translations.map((t) => ({
        product_id: newProduct.id,
        locale: t.locale,
        name: `[Cópia] ${t.name}`,
        description: t.description,
      }))
    );
  }

  // Clone variants (stock zeroed)
  if (source.product_variants?.length) {
    await supabase.from("product_variants").insert(
      source.product_variants.map((v) => ({
        product_id: newProduct.id,
        slug: v.slug,
        seed_count: v.seed_count,
        price_cents: v.price_cents,
        stock: 0,
        active: v.active ?? true,
        on_sale: false,
        discount_type: null,
        discount_value: 0,
        sale_ends_at: null,
      }))
    );
  }

  // Clone terpenes
  if (source.product_terpenes?.length) {
    await supabase.from("product_terpenes").insert(
      source.product_terpenes.map((t) => ({
        product_id: newProduct.id,
        terpene_id: t.terpene_id,
        is_dominant: t.is_dominant ?? false,
      }))
    );
  }

  return NextResponse.json({ id: newProduct.id, slug: newProduct.slug }, { status: 201 });
}
