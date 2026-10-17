/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env manually (same pattern as run-migration-031.js)
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);
const NEEDLE = "res.cloudinary.com";

function hasCloudinary(val) {
  return typeof val === "string" && val.includes(NEEDLE);
}

(async () => {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, slug, images, hero_video_url, hero_poster_url");

  if (error) {
    console.error("Query failed:", error.message);
    process.exit(1);
  }

  let touched = 0;
  for (const p of products ?? []) {
    const updates = {};

    const imgs = Array.isArray(p.images) ? p.images : [];
    const cleanImages = imgs.filter((u) => !hasCloudinary(u));
    if (cleanImages.length !== imgs.length) updates.images = cleanImages;

    if (hasCloudinary(p.hero_video_url)) updates.hero_video_url = null;
    if (hasCloudinary(p.hero_poster_url)) updates.hero_poster_url = null;

    if (Object.keys(updates).length === 0) continue;

    const { error: updErr } = await supabase
      .from("products")
      .update(updates)
      .eq("id", p.id);

    if (updErr) {
      console.error(`[${p.slug}] update failed:`, updErr.message);
      continue;
    }

    touched += 1;
    console.log(`[${p.slug}] updated:`, Object.keys(updates).join(", "));
  }

  console.log(`Migration 038 applied. Products touched: ${touched}`);
})();
