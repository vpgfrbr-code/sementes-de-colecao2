import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAdminError } from "@/lib/admin";
import { isAllowedFileBytes } from "@/lib/file-magic";
import { getPublicUrl, putObject } from "@/lib/r2";

export const maxDuration = 60;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
]);

const MAX_SIZE = 12 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

function sanitizeFolder(folder: string): string {
  return folder.replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "general";
}

function sanitizeBaseName(name: string): string {
  const base = name.replace(/\.[^/.]+$/, "");
  return base.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60) || "file";
}

export async function POST(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = sanitizeFolder((formData.get("folder") as string) || "general");

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `File type ${file.type} not allowed` },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 12MB)" },
      { status: 400 }
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!isAllowedFileBytes(new Uint8Array(buffer.subarray(0, 16)), ALLOWED_TYPES)) {
      return NextResponse.json(
        { error: "File contents do not match a supported format" },
        { status: 400 }
      );
    }

    const ext = EXT_BY_TYPE[file.type] ?? "bin";
    const base = sanitizeBaseName(file.name);
    const path = `${folder}/${Date.now()}-${base}.${ext}`;

    await putObject(path, buffer, file.type);

    return NextResponse.json(
      { url: getPublicUrl(path), path },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[admin/upload] R2 upload error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
