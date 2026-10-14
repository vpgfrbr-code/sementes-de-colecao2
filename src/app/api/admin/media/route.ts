import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAdminError } from "@/lib/admin";
import { getPublicUrl, listAllObjects } from "@/lib/r2";

const PAGE_SIZE = 100;

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "m4v"]);

type MediaResource = {
  public_id: string;
  secure_url: string;
  resource_type: "image" | "video";
  format: string;
  bytes: number;
  created_at: string;
};

function classify(name: string): {
  resource_type: "image" | "video" | null;
  format: string;
} {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  if (IMAGE_EXTS.has(ext)) return { resource_type: "image", format: ext };
  if (VIDEO_EXTS.has(ext)) return { resource_type: "video", format: ext };
  return { resource_type: null, format: ext };
}

/**
 * Lists media stored in the R2 bucket. Filter by ?type=image|video|all.
 */
export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const typeFilter = (req.nextUrl.searchParams.get("type") ?? "all") as
    | "all"
    | "image"
    | "video";

  try {
    const objects = await listAllObjects();

    const resources: MediaResource[] = [];
    for (const obj of objects) {
      const name = obj.key.split("/").pop() ?? obj.key;
      const { resource_type, format } = classify(name);
      if (!resource_type) continue;
      if (typeFilter !== "all" && resource_type !== typeFilter) continue;

      resources.push({
        public_id: obj.key,
        secure_url: getPublicUrl(obj.key),
        resource_type,
        format,
        bytes: obj.size,
        created_at: (obj.lastModified ?? new Date()).toISOString(),
      });
    }

    resources.sort((a, b) => b.created_at.localeCompare(a.created_at));

    const cursor = Number(req.nextUrl.searchParams.get("cursor") ?? "0") || 0;
    const slice = resources.slice(cursor, cursor + PAGE_SIZE);
    const next =
      cursor + PAGE_SIZE < resources.length ? String(cursor + PAGE_SIZE) : null;

    return NextResponse.json({
      resources: slice,
      next_cursor: next,
      total_count: resources.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list media";
    console.error("[admin/media] R2 list error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
