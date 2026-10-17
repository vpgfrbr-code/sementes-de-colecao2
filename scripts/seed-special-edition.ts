/**
 * Seed script: Special Edition products
 * Run: npx tsx scripts/seed-special-edition.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------- Data from the image ----------
const PRODUCTS = [
  {
    slug: "chimera-3-x-cap-junky",
    seed_count: 7,
    stock: 1,
    names: {
      pt: "Chimera #3 x Cap Junky",
      en: "Chimera #3 x Cap Junky",
      es: "Chimera #3 x Cap Junky",
    },
    descriptions: {
      pt: "Cruzamento exclusivo de edição especial: Chimera #3 x Cap Junky. Pack com 7 sementes regulares.",
      en: "Exclusive special edition cross: Chimera #3 x Cap Junky. Pack with 7 regular seeds.",
      es: "Cruce exclusivo de edición especial: Chimera #3 x Cap Junky. Pack con 7 semillas regulares.",
    },
    parent_mother: "Chimera #3",
    parent_father: "Cap Junky",
  },
  {
    slug: "miracle-gushers-x-cherry-marker",
    seed_count: 8,
    stock: 1,
    names: {
      pt: "Miracle Gushers x Cherry Marker",
      en: "Miracle Gushers x Cherry Marker",
      es: "Miracle Gushers x Cherry Marker",
    },
    descriptions: {
      pt: "Cruzamento exclusivo de edição especial: Miracle Gushers x Cherry Marker. Pack com 8 sementes regulares.",
      en: "Exclusive special edition cross: Miracle Gushers x Cherry Marker. Pack with 8 regular seeds.",
      es: "Cruce exclusivo de edición especial: Miracle Gushers x Cherry Marker. Pack con 8 semillas regulares.",
    },
    parent_mother: "Miracle Gushers",
    parent_father: "Cherry Marker",
  },
  {
    slug: "geta-z-14-x-blue-zushi",
    seed_count: 8,
    stock: 1,
    names: {
      pt: "Geta Z #14 x Blue Zushi",
      en: "Geta Z #14 x Blue Zushi",
      es: "Geta Z #14 x Blue Zushi",
    },
    descriptions: {
      pt: "Cruzamento exclusivo de edição especial: Geta Z #14 x Blue Zushi. Pack com 8 sementes regulares.",
      en: "Exclusive special edition cross: Geta Z #14 x Blue Zushi. Pack with 8 regular seeds.",
      es: "Cruce exclusivo de edición especial: Geta Z #14 x Blue Zushi. Pack con 8 semillas regulares.",
    },
    parent_mother: "Geta Z #14",
    parent_father: "Blue Zushi",
  },
  {
    slug: "pineapple-fruz-x-blue-zushi",
    seed_count: 10,
    stock: 1,
    names: {
      pt: "Pineapple Fruz x Blue Zushi",
      en: "Pineapple Fruz x Blue Zushi",
      es: "Pineapple Fruz x Blue Zushi",
    },
    descriptions: {
      pt: "Cruzamento exclusivo de edição especial: Pineapple Fruz x Blue Zushi. Pack com 10 sementes regulares.",
      en: "Exclusive special edition cross: Pineapple Fruz x Blue Zushi. Pack with 10 regular seeds.",
      es: "Cruce exclusivo de edición especial: Pineapple Fruz x Blue Zushi. Pack con 10 semillas regulares.",
    },
    parent_mother: "Pineapple Fruz",
    parent_father: "Blue Zushi",
  },
  {
    slug: "stay-puff-x-cherry-marker",
    seed_count: 7,
    stock: 1,
    names: {
      pt: "Stay Puff x Cherry Marker",
      en: "Stay Puff x Cherry Marker",
      es: "Stay Puff x Cherry Marker",
    },
    descriptions: {
      pt: "Cruzamento exclusivo de edição especial: Stay Puff x Cherry Marker. Pack com 7 sementes regulares.",
      en: "Exclusive special edition cross: Stay Puff x Cherry Marker. Pack with 7 regular seeds.",
      es: "Cruce exclusivo de edición especial: Stay Puff x Cherry Marker. Pack con 7 semillas regulares.",
    },
    parent_mother: "Stay Puff",
    parent_father: "Cherry Marker",
  },
  {
    slug: "chimera-3-x-cherry-marker",
    seed_count: 6,
    stock: 1,
    names: {
      pt: "Chimera #3 x Cherry Marker",
      en: "Chimera #3 x Cherry Marker",
      es: "Chimera #3 x Cherry Marker",
    },
    descriptions: {
      pt: "Cruzamento exclusivo de edição especial: Chimera #3 x Cherry Marker. Pack com 6 sementes regulares.",
      en: "Exclusive special edition cross: Chimera #3 x Cherry Marker. Pack with 6 regular seeds.",
      es: "Cruce exclusivo de edición especial: Chimera #3 x Cherry Marker. Pack con 6 semillas regulares.",
    },
    parent_mother: "Chimera #3",
    parent_father: "Cherry Marker",
  },
];

// Price: $50 USD for all packs (adjust as needed)
const PRICE_CENTS = 5000;
const SHIPPING_CENTS = 2000;

async function main() {
  console.log("Starting seed: Special Edition products...\n");

  // 1. Create "Edição Especial" category
  console.log("Creating category: EDIÇÃO ESPECIAL");
  const { data: cat, error: catErr } = await supabase
    .from("categories")
    .insert({ slug: "edicao-especial" })
    .select("id")
    .single();

  if (catErr) {
    // Maybe already exists
    if (catErr.code === "23505") {
      console.log("  Category already exists, fetching...");
      const { data: existing } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", "edicao-especial")
        .single();
      if (!existing) throw new Error("Could not find or create category");
      var categoryId = existing.id;
    } else {
      throw catErr;
    }
  } else {
    var categoryId = cat.id;
  }

  console.log(`  Category ID: ${categoryId}`);

  // Category translations
  const catTranslations = [
    { category_id: categoryId, locale: "pt", name: "Edição Especial", description: "Cruzamentos exclusivos em edição limitada" },
    { category_id: categoryId, locale: "en", name: "Special Edition", description: "Exclusive limited edition crosses" },
    { category_id: categoryId, locale: "es", name: "Edición Especial", description: "Cruces exclusivos de edición limitada" },
  ];

  const { error: catTransErr } = await supabase
    .from("category_translations")
    .upsert(catTranslations, { onConflict: "category_id,locale" });

  if (catTransErr) console.error("  Category translations error:", catTransErr);
  else console.log("  Category translations OK (pt/en/es)\n");

  // 2. Create each product
  for (const product of PRODUCTS) {
    console.log(`Creating product: ${product.names.en}`);

    const { data: prod, error: prodErr } = await supabase
      .from("products")
      .insert({
        slug: product.slug,
        price_cents: PRICE_CENTS,
        stock: product.stock,
        images: [],
        active: true,
        category_id: categoryId,
        shipping_cents: SHIPPING_CENTS,
        seed_type: "regular",
        parent_mother: product.parent_mother,
        parent_father: product.parent_father,
        genetics: `${product.parent_mother} x ${product.parent_father}`,
      })
      .select("id")
      .single();

    if (prodErr) {
      if (prodErr.code === "23505") {
        console.log(`  Slug "${product.slug}" already exists, skipping.`);
        continue;
      }
      console.error(`  Error:`, prodErr);
      continue;
    }

    const productId = prod.id;
    console.log(`  Product ID: ${productId}`);

    // Translations
    const translations = (["pt", "en", "es"] as const).map((locale) => ({
      product_id: productId,
      locale,
      name: product.names[locale],
      description: product.descriptions[locale],
    }));

    const { error: transErr } = await supabase
      .from("product_translations")
      .insert(translations);

    if (transErr) console.error("  Translation error:", transErr);
    else console.log("  Translations OK");

    // Variant (single pack)
    const { error: varErr } = await supabase
      .from("product_variants")
      .insert({
        product_id: productId,
        slug: `${product.seed_count}-seeds`,
        seed_count: product.seed_count,
        price_cents: PRICE_CENTS,
        shipping_cents: 0, // shipping is on the product level
        stock: product.stock,
        active: true,
      });

    if (varErr) console.error("  Variant error:", varErr);
    else console.log(`  Variant OK (${product.seed_count} seeds, stock: ${product.stock})`);

    console.log("");
  }

  console.log("Done! All Special Edition products seeded.");
}

main().catch(console.error);
