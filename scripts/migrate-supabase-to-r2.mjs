/**
 * Migrate every object in the public Supabase Storage bucket `media` to a
 * Cloudflare R2 bucket. Idempotent: skips objects that already exist in R2
 * with the same size.
 *
 * Required env (loaded automatically when invoked with `node --env-file=.env`):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET
 *
 * Usage:
 *   node --env-file=.env scripts/migrate-supabase-to-r2.mjs
 *   node --env-file=.env scripts/migrate-supabase-to-r2.mjs --dry-run
 *   node --env-file=.env scripts/migrate-supabase-to-r2.mjs --prefix=products/
 *
 * Re-run safely: existing R2 objects are skipped unless --force is passed.
 */
import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const force = args.has("--force");
const prefixArg = process.argv.find((a) => a.startsWith("--prefix="));
const onlyPrefix = prefixArg ? prefixArg.slice("--prefix=".length) : "";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const SUPABASE_BUCKET = "media";

for (const [k, v] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SUPABASE_KEY,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
})) {
  if (!v) {
    console.error(`Missing env var ${k}`);
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const CONTENT_TYPE_BY_EXT = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
};

function guessContentType(name) {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  return CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream";
}

async function listAll(prefix) {
  /** @type {Array<{path: string, size: number}>} */
  const out = [];
  // Supabase storage list isn't recursive — walk top-level + each subfolder.
  const { data: rootEntries, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .list(prefix || "", { limit: 10000 });
  if (error) throw new Error(`list("${prefix}") failed: ${error.message}`);

  for (const e of rootEntries ?? []) {
    const fullPath = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.id) {
      // It's a file.
      out.push({ path: fullPath, size: e.metadata?.size ?? 0 });
    } else {
      // It's a folder — recurse.
      const sub = await listAll(fullPath);
      out.push(...sub);
    }
  }
  return out;
}

async function existsInR2(key) {
  try {
    const res = await r2.send(
      new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    );
    return { exists: true, size: res.ContentLength ?? 0 };
  } catch {
    return { exists: false, size: 0 };
  }
}

async function migrateOne(item) {
  const key = item.path.replace(/^\/+/, "");

  if (!force) {
    const head = await existsInR2(key);
    if (head.exists && head.size === item.size) {
      return { status: "skip-exists" };
    }
  }

  // Download from Supabase.
  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .download(item.path);
  if (error || !data) {
    return { status: "error", error: error?.message ?? "no data" };
  }
  const arrayBuffer = await data.arrayBuffer();
  const body = Buffer.from(arrayBuffer);

  if (dryRun) {
    return { status: "dry-run", size: body.length };
  }

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: data.type || guessContentType(item.path),
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return { status: "uploaded", size: body.length };
}

async function main() {
  console.log(
    `Migrating supabase://${SUPABASE_BUCKET}${onlyPrefix ? "/" + onlyPrefix : ""} → r2://${R2_BUCKET}${dryRun ? " [dry-run]" : ""}${force ? " [force]" : ""}`,
  );
  const items = await listAll(onlyPrefix);
  console.log(`Found ${items.length} files in Supabase Storage`);

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;
  let bytes = 0;

  // Run with a small concurrency to be polite to both providers.
  const concurrency = 4;
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const item = items[idx];
      try {
        const res = await migrateOne(item);
        if (res.status === "uploaded" || res.status === "dry-run") {
          uploaded++;
          bytes += res.size ?? 0;
          console.log(
            `[${idx + 1}/${items.length}] ${res.status === "dry-run" ? "DRY" : "OK "} ${item.path} (${(item.size / 1024).toFixed(1)} KB)`,
          );
        } else if (res.status === "skip-exists") {
          skipped++;
        } else {
          errors++;
          console.error(
            `[${idx + 1}/${items.length}] ERR ${item.path}: ${res.error}`,
          );
        }
      } catch (err) {
        errors++;
        console.error(
          `[${idx + 1}/${items.length}] ERR ${item.path}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  console.log("");
  console.log(`Done. uploaded=${uploaded} skipped=${skipped} errors=${errors}`);
  console.log(`Total transferred: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
