import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, isAdminError } from "@/lib/admin";
import { putObject, getPublicUrl } from "@/lib/r2";

export const maxDuration = 15;

const MAX_SIZES: Record<string, number> = {
  logoUrl: 2 * 1024 * 1024,
  logoInverseUrl: 2 * 1024 * 1024,
  faviconUrl: 1 * 1024 * 1024,
  ogImageUrl: 4 * 1024 * 1024,
};

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

const SLOTS = new Set([
  "logoUrl",
  "logoInverseUrl",
  "faviconUrl",
  "ogImageUrl",
]);

/**
 * Strips SVG vectors that can execute JavaScript when the asset is opened
 * directly in a browser. Defense-in-depth: most consumption paths are safe
 * (next/image renders <img>, email clients sandbox JS), but the asset is
 * also served standalone from R2.
 *
 * Removes: <script>, <foreignObject>, <iframe>, <embed>, <object>; on*
 * event-handler attributes; href/xlink:href values starting with
 * "javascript:"; CDATA sections that wrap script payloads.
 */
function sanitizeSvg(input: string): string {
  let out = input;
  out = out.replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, "");
  out = out.replace(
    /<\s*(script|foreignObject|iframe|embed|object)\b[\s\S]*?<\s*\/\s*\1\s*>/gi,
    ""
  );
  out = out.replace(
    /<\s*(script|foreignObject|iframe|embed|object)\b[^>]*\/?\s*>/gi,
    ""
  );
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
  out = out.replace(
    /\s(href|xlink:href)\s*=\s*("|')\s*javascript:[^"']*\2/gi,
    ""
  );
  return out;
}

/**
 * POST /api/admin/branding/upload (superadmin only).
 * multipart/form-data with fields:
 *   - file: the asset
 *   - slot: one of logoUrl | logoInverseUrl | faviconUrl | ogImageUrl
 *
 * SVG uploads pass through sanitizeSvg before hitting R2. Other formats
 * are uploaded as-is. Public URL is returned so the caller can persist it
 * via the branding settings PUT.
 */
export async function POST(req: NextRequest) {
  const adminResult = await requireSuperAdmin();
  if (isAdminError(adminResult)) return adminResult;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const slot = form.get("slot");
  const file = form.get("file");
  if (typeof slot !== "string" || !SLOTS.has(slot)) {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const fileType = file.type;
  if (!ALLOWED_TYPES.has(fileType)) {
    return NextResponse.json(
      { error: `File type ${fileType || "(unknown)"} not allowed` },
      { status: 400 }
    );
  }

  const maxSize = MAX_SIZES[slot] ?? 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      {
        error: `File too large (max ${Math.round(maxSize / (1024 * 1024))}MB)`,
      },
      { status: 400 }
    );
  }

  let body: Buffer;
  try {
    const ab = await file.arrayBuffer();
    body =
      fileType === "image/svg+xml"
        ? Buffer.from(sanitizeSvg(Buffer.from(ab).toString("utf8")), "utf8")
        : Buffer.from(ab);
  } catch {
    return NextResponse.json(
      { error: "Failed to read file body" },
      { status: 400 }
    );
  }

  const ext = EXT_BY_TYPE[fileType];
  const path = `branding/${slot}-${Date.now()}.${ext}`;

  try {
    await putObject(path, body, fileType);
  } catch (err) {
    console.error("[admin/branding/upload] R2 putObject failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  return NextResponse.json({ publicUrl: getPublicUrl(path), path });
}
