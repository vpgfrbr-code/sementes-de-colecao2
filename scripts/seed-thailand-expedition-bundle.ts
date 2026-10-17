/**
 * Seed script: Thailand Expedition Bundle Pack
 *
 * Creates a bundle product containing:
 *   • 5 seeds Maracuruja
 *   • 5 seeds Forbidden Orange
 *
 * Price: $90 USD  |  Shipping: $20 USD (flat rate)
 *
 * Run: npx tsx scripts/seed-thailand-expedition-bundle.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in environment
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Component slugs — must already exist in the products table
const COMPONENT_SLUGS = ["maracuruja", "forbidden-orange"] as const;
const SEEDS_PER_COMPONENT = 5; // 5 seeds of each per bundle unit

const BUNDLE_SLUG = "thailand-expedition";
const BUNDLE_PRICE_CENTS = 9000;  // $90.00 USD
const BUNDLE_SHIPPING_CENTS = 2000; // $20.00 USD

async function main() {
  console.log("Looking up component products...");

  const { data: components, error: compError } = await supabase
    .from("products")
    .select("id, slug, product_translations(locale, name)")
    .in("slug", COMPONENT_SLUGS);

  if (compError || !components || components.length < COMPONENT_SLUGS.length) {
    console.error(
      `Expected ${COMPONENT_SLUGS.length} components, found ${components?.length ?? 0}.`,
      compError
    );
    console.error(
      "Missing slugs:",
      COMPONENT_SLUGS.filter((s) => !components?.some((c) => c.slug === s))
    );
    process.exit(1);
  }

  const maracuruja = components.find((c) => c.slug === "maracuruja")!;
  const forbiddenOrange = components.find((c) => c.slug === "forbidden-orange")!;

  console.log(`  ✔ Maracuruja:       ${maracuruja.id}`);
  console.log(`  ✔ Forbidden Orange: ${forbiddenOrange.id}`);

  // Check if bundle already exists
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("slug", BUNDLE_SLUG)
    .maybeSingle();

  if (existing) {
    console.log(`Bundle "${BUNDLE_SLUG}" already exists (id: ${existing.id}). Skipping creation.`);
    process.exit(0);
  }

  // Create bundle product
  console.log("Creating bundle product...");
  const { data: bundle, error: bundleError } = await supabase
    .from("products")
    .insert({
      slug: BUNDLE_SLUG,
      product_type: "bundle",
      price_cents: 0,          // not used directly — variant holds the price
      shipping_cents: BUNDLE_SHIPPING_CENTS,
      stock: 0,                // virtual — derived from component stocks
      images: [],
      active: true,
      on_sale: false,
      is_featured: false,
      variant_discounts_enabled: false,
    })
    .select("id")
    .single();

  if (bundleError || !bundle) {
    console.error("Failed to create bundle product:", bundleError);
    process.exit(1);
  }
  console.log(`  ✔ Bundle product created: ${bundle.id}`);

  // Translations
  const translations = [
    {
      locale: "pt",
      name: "Thailand Expedition Bundle",
      description:
        "Pack exclusivo Thailand Expedition: 5 sementes Maracuruja + 5 sementes Forbidden Orange. Duas genetics excepcionais colhidas diretamente de espécies raras descobertas em expedição à Tailândia, reunidas em um único pack colecionável.",
    },
    {
      locale: "en",
      name: "Thailand Expedition Bundle",
      description:
        "Exclusive Thailand Expedition Pack: 5 Maracuruja seeds + 5 Forbidden Orange seeds. Two exceptional genetics harvested directly from rare species discovered on a Thailand expedition, united in a single collector's pack.",
    },
    {
      locale: "es",
      name: "Thailand Expedition Bundle",
      description:
        "Pack exclusivo Thailand Expedition: 5 semillas Maracuruja + 5 semillas Forbidden Orange. Dos genéticas excepcionales cosechadas directamente de especies raras descubiertas en una expedición a Tailandia, reunidas en un único pack de colección.",
    },
  ];

  const { error: transError } = await supabase.from("product_translations").insert(
    translations.map((t) => ({ ...t, product_id: bundle.id }))
  );
  if (transError) {
    console.error("Failed to insert translations:", transError);
    process.exit(1);
  }
  console.log("  ✔ Translations inserted (pt/en/es)");

  // Variant — seed_count=0 for bundles (checkout uses component counts)
  const variantSlug = `${BUNDLE_SLUG}-5-5`;
  const { error: varError } = await supabase.from("product_variants").insert({
    product_id: bundle.id,
    slug: variantSlug,
    seed_count: 0,
    price_cents: BUNDLE_PRICE_CENTS,
    shipping_cents: 0, // shipping is on the product level
    stock: 0,
    active: true,
    on_sale: false,
  });
  if (varError) {
    console.error("Failed to insert variant:", varError);
    process.exit(1);
  }
  console.log(`  ✔ Variant "${variantSlug}" created ($${BUNDLE_PRICE_CENTS / 100})`);

  // Bundle components
  const bundleComponents = [
    { bundle_product_id: bundle.id, component_product_id: maracuruja.id, seed_count: SEEDS_PER_COMPONENT },
    { bundle_product_id: bundle.id, component_product_id: forbiddenOrange.id, seed_count: SEEDS_PER_COMPONENT },
  ];
  const { error: compInsertError } = await supabase
    .from("bundle_components")
    .insert(bundleComponents);

  if (compInsertError) {
    console.error("Failed to insert bundle components:", compInsertError);
    process.exit(1);
  }
  console.log(
    `  ✔ Bundle components: ${SEEDS_PER_COMPONENT}× Maracuruja + ${SEEDS_PER_COMPONENT}× Forbidden Orange`
  );

  console.log("\n✅ Thailand Expedition Bundle created successfully!");
  console.log(`   Product ID : ${bundle.id}`);
  console.log(`   Slug       : ${BUNDLE_SLUG}`);
  console.log(`   Price      : $${BUNDLE_PRICE_CENTS / 100}`);
  console.log(`   Shipping   : $${BUNDLE_SHIPPING_CENTS / 100}`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
