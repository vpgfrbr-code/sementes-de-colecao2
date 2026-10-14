import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAdminError } from "@/lib/admin";
import { getPresignedPutUrl, getPublicUrl } from "@/lib/r2";

export const maxDuration = 10;

const MAX_SIZE = 200 * 1024 * 1024; // 200MB — for direct-to-storage video uploads

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

function sanitizeFolder(folder: string): string {
  return folder.replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "general";
}

function sanitizeBaseName(name: string): string {
  const base = name.replace(/\.[^/.]+$/, "");
  return base.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60) || "file";
}

/**
 * Returns a short-lived R2 presigned PUT URL so the browser can upload the
 * file directly to R2, bypassing Vercel's request-body size limit.
 *
 * Body: { folder, fileName, fileType, fileSize }
 * Returns: { signedUrl, path, publicUrl }
 *
 * The browser MUST send the upload with `Content-Type: <fileType>` matching
 * what was signed — otherwise R2 will reject the signature.
 */
export async function POST(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fileName = typeof body.fileName === "string" ? body.fileName : "";
  const fileType = typeof body.fileType === "string" ? body.fileType : "";
  const fileSize = typeof body.fileSize === "number" ? body.fileSize : -1;
  const folder = sanitizeFolder(
    typeof body.folder === "string" ? body.folder : "general"
  );

  if (!fileName || !fileType || fileSize < 0) {
    return NextResponse.json(
      { error: "Missing fileName, fileType, or fileSize" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.has(fileType)) {
    return NextResponse.json(
      { error: `File type ${fileType} not allowed` },
      { status: 400 }
    );
  }

  if (fileSize > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 200MB)" },
      { status: 400 }
    );
  }

  const ext = EXT_BY_TYPE[fileType] ?? "bin";
  const base = sanitizeBaseName(fileName);
  const path = `${folder}/${Date.now()}-${base}.${ext}`;

  try {
    const signedUrl = await getPresignedPutUrl(path, fileType);
    return NextResponse.json({
      signedUrl,
      path,
      publicUrl: getPublicUrl(path),
    });
  } catch (err) {
    console.error("[admin/upload/signed-url] R2 presign failed:", err);
    return NextResponse.json(
      { error: "Failed to prepare upload" },
      { status: 500 }
    );
  }
}
