/**
 * Cloudflare R2 client (S3-compatible).
 *
 * Why R2 instead of Supabase Storage:
 * - Egress is free on R2 (Supabase free tier blocked at 5 GB egress).
 * - 10 GB storage included; $0.015/GB-month after.
 * - S3-compatible API → use @aws-sdk/client-s3.
 *
 * Required env vars (set in .env and Vercel):
 *   R2_ACCOUNT_ID            Cloudflare account id (32-hex string)
 *   R2_ACCESS_KEY_ID         R2 API token "Access Key ID"
 *   R2_SECRET_ACCESS_KEY     R2 API token "Secret Access Key"
 *   R2_BUCKET                bucket name (e.g. "sementes-media")
 *   R2_PUBLIC_URL            base public URL for the bucket — either the
 *                            *.r2.dev URL given by R2 when "Public Access"
 *                            is enabled, or a custom domain. NO trailing slash.
 *
 * Public read URLs are returned by getPublicUrl(path) and are what we save
 * into the database (products.images[], hero_banners.image_url, ...).
 */
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

let cached: S3Client | null = null;

export function getR2Client(): S3Client {
  if (cached) return cached;
  const accountId = requireEnv("R2_ACCOUNT_ID");
  cached = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return cached;
}

export function r2Bucket(): string {
  return requireEnv("R2_BUCKET");
}

/**
 * Build a public URL for a key inside the bucket. Caller is responsible for
 * ensuring the bucket is publicly readable (R2 dashboard → Settings → Public
 * Access → enable r2.dev or attach custom domain).
 */
export function getPublicUrl(path: string): string {
  const base = requireEnv("R2_PUBLIC_URL").replace(/\/+$/, "");
  const clean = path.replace(/^\/+/, "");
  return `${base}/${clean}`;
}

/** Server-side upload of a Buffer/Uint8Array. */
export async function putObject(
  path: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: path.replace(/^\/+/, ""),
      Body: body,
      ContentType: contentType,
      // 1 year — keys include a timestamp + random component, so they're
      // effectively immutable.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

/**
 * Issue a short-lived presigned PUT URL so the browser can upload directly to
 * R2, bypassing Vercel's 4.5 MB request body limit.
 */
export async function getPresignedPutUrl(
  path: string,
  contentType: string,
  expiresInSeconds = 60 * 5,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: r2Bucket(),
    Key: path.replace(/^\/+/, ""),
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });
  return getSignedUrl(getR2Client(), cmd, { expiresIn: expiresInSeconds });
}

/** Object metadata returned by listAllObjects. */
export interface R2ObjectMeta {
  key: string;
  size: number;
  lastModified?: Date;
}

/** Walks every page in the bucket. Use sparingly — calls are billed per 1k. */
export async function listAllObjects(
  prefix?: string,
): Promise<R2ObjectMeta[]> {
  const client = getR2Client();
  const out: R2ObjectMeta[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: r2Bucket(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of res.Contents ?? []) {
      if (!obj.Key) continue;
      out.push({
        key: obj.Key,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified,
      });
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return out;
}

export async function deleteObject(path: string): Promise<void> {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: r2Bucket(),
      Key: path.replace(/^\/+/, ""),
    }),
  );
}

export async function headObject(path: string): Promise<{ size: number } | null> {
  try {
    const res = await getR2Client().send(
      new HeadObjectCommand({
        Bucket: r2Bucket(),
        Key: path.replace(/^\/+/, ""),
      }),
    );
    return { size: res.ContentLength ?? 0 };
  } catch {
    return null;
  }
}
