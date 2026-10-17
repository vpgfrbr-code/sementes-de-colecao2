/**
 * Backfill missing canonical PT translations.
 *
 * For every product whose product_translations has no PT row (or PT with empty
 * name), this script inserts a PT row using the best available locale's name
 * (preferring EN, then ES, then any non-empty), with empty description so the
 * admin can fill it later. This unblocks the public product page, which now
 * gracefully falls back to PT for missing locales.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-translations.ts
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in environment.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface Row {
  id: string;
  slug: string;
  product_translations: { locale: string; name: string | null; description: string | null }[];
}

async function main() {
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, product_translations(locale, name, description)");

  if (error) {
    console.error("Failed to fetch products:", error.message);
    process.exit(1);
  }

  const rows = (data ?? []) as Row[];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const product of rows) {
    const translations = product.product_translations ?? [];
    const pt = translations.find((t) => t.locale === "pt");
    const ptHasName = pt?.name && pt.name.trim().length > 0;

    if (ptHasName) {
      skipped += 1;
      continue;
    }

    const fallback =
      translations.find((t) => t.locale === "en" && t.name?.trim()) ??
      translations.find((t) => t.locale === "es" && t.name?.trim()) ??
      translations.find((t) => t.name?.trim());

    const name = fallback?.name?.trim() || product.slug;
    const description = fallback?.description ?? "";

    if (pt) {
      // PT row exists but name is empty — update it
      const { error: updErr } = await supabase
        .from("product_translations")
        .update({ name, description: pt.description ?? description })
        .eq("product_id", product.id)
        .eq("locale", "pt");
      if (updErr) {
        console.error(`  ✘ Failed to update PT for ${product.slug}: ${updErr.message}`);
      } else {
        updated += 1;
        console.log(`  ✔ Updated PT name for ${product.slug}: "${name}"`);
      }
    } else {
      const { error: insErr } = await supabase.from("product_translations").insert({
        product_id: product.id,
        locale: "pt",
        name,
        description,
      });
      if (insErr) {
        console.error(`  ✘ Failed to insert PT for ${product.slug}: ${insErr.message}`);
      } else {
        inserted += 1;
        console.log(`  ✔ Inserted PT for ${product.slug}: "${name}"`);
      }
    }
  }

  console.log(
    `\nDone. Inserted: ${inserted}, Updated: ${updated}, Skipped (already OK): ${skipped}, Total: ${rows.length}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
