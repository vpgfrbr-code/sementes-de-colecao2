/**
 * Rewrite Supabase Storage URLs to Cloudflare R2 URLs across the database.
 *
 * Targets:
 *   - products.images       (text[])
 *   - products.hero_video_url, products.hero_poster_url (text)
 *   - hero_banners.image_url, hero_banners.image_url_mobile (text)
 *
 * The rewrite is a pure string replacement of the bucket public-URL prefix:
 *   https://<project>.supabase.co/storage/v1/object/public/media/<key>
 *     →  ${R2_PUBLIC_URL}/<key>
 *
 * Required env (loaded with `node --env-file=.env`):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   R2_PUBLIC_URL
 *
 * Usage:
 *   node --env-file=.env scripts/rewrite-asset-urls.mjs --dry-run
 *   node --env-file=.env scripts/rewrite-asset-urls.mjs            # apply
 *
 * The --dry-run mode prints every row that *would* be updated and the diff,
 * but writes nothing.
 */
import { createClient } from "@supabase/supabase-js";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");

for (const [k, v] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SUPABASE_KEY,
  R2_PUBLIC_URL,
})) {
  if (!v) {
    console.error(`Missing env var ${k}`);
    process.exit(1);
  }
}

const SUPABASE_PREFIX = `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/media/`;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Rewrite a single URL string. Returns the rewritten URL, or null if it
 * doesn't match the Supabase Storage prefix and should be left alone.
 */
function rewrite(url) {
  if (typeof url !== "string" || !url) return null;
  if (!url.startsWith(SUPABASE_PREFIX)) return null;
  const key = url.slice(SUPABASE_PREFIX.length);
  return `${R2_PUBLIC_URL}/${key}`;
}

async function rewriteProducts() {
  console.log("\n== products ==");
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, images, hero_video_url, hero_poster_url");
  if (error) throw new Error(`select products: ${error.message}`);

  let touched = 0;
  for (const row of data ?? []) {
    /** @type {Record<string, unknown>} */
    const update = {};

    if (Array.isArray(row.images)) {
      const next = row.images.map((u) => rewrite(u) ?? u);
      if (next.some((u, i) => u !== row.images[i])) update.images = next;
    }
    const heroV = rewrite(row.hero_video_url);
    if (heroV) update.hero_video_url = heroV;
    const heroP = rewrite(row.hero_poster_url);
    if (heroP) update.hero_poster_url = heroP;

    if (Object.keys(update).length === 0) continue;
    touched++;
    console.log(`  ${row.slug} (${row.id})`, update);

    if (!dryRun) {
      const { error: upErr } = await supabase
        .from("products")
        .update(update)
        .eq("id", row.id);
      if (upErr) console.error(`  UPDATE failed: ${upErr.message}`);
    }
  }
  console.log(`products: ${touched} row(s) ${dryRun ? "would update" : "updated"}`);
}

async function rewriteBanners() {
  console.log("\n== hero_banners ==");
  const { data, error } = await supabase
    .from("hero_banners")
    .select("id, image_url, image_url_mobile");
  if (error) throw new Error(`select hero_banners: ${error.message}`);

  let touched = 0;
  for (const row of data ?? []) {
    /** @type {Record<string, unknown>} */
    const update = {};
    const a = rewrite(row.image_url);
    if (a) update.image_url = a;
    const b = rewrite(row.image_url_mobile);
    if (b) update.image_url_mobile = b;

    if (Object.keys(update).length === 0) continue;
    touched++;
    console.log(`  banner ${row.id}`, update);

    if (!dryRun) {
      const { error: upErr } = await supabase
        .from("hero_banners")
        .update(update)
        .eq("id", row.id);
      if (upErr) console.error(`  UPDATE failed: ${upErr.message}`);
    }
  }
  console.log(`hero_banners: ${touched} row(s) ${dryRun ? "would update" : "updated"}`);
}

async function main() {
  console.log(`Rewriting "${SUPABASE_PREFIX}*" → "${R2_PUBLIC_URL}/*"`);
  console.log(dryRun ? "[DRY RUN — no writes]" : "[APPLY MODE]");
  await rewriteProducts();
  await rewriteBanners();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Rewrite failed:", err);
  process.exit(1);
});
