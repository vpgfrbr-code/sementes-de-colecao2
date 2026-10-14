import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";
import type { Database } from "@/lib/supabase/types";

type BannerUpdate = Database["public"]["Tables"]["hero_banners"]["Update"];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;

  let body: {
    image_url?: string;
    image_url_mobile?: string | null;
    media_type?: string;
    link?: string;
    sort_order?: number;
    active?: boolean;
    translations?: { locale: string; title?: string; subtitle?: string }[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServerClient();

  const update: BannerUpdate = {};
  if (body.image_url !== undefined) update.image_url = body.image_url;
  if (body.image_url_mobile !== undefined) update.image_url_mobile = body.image_url_mobile;
  if (body.media_type !== undefined) update.media_type = body.media_type;
  if (body.link !== undefined) update.link = body.link;
  if (body.sort_order !== undefined) update.sort_order = body.sort_order;
  if (body.active !== undefined) update.active = body.active;

  if (Object.keys(update).length > 0) {
    const { error } = await supabase
      .from("hero_banners")
      .update(update)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (body.translations?.length) {
    for (const t of body.translations) {
      await supabase
        .from("hero_banner_translations")
        .upsert(
          {
            banner_id: id,
            locale: t.locale,
            title: t.title ?? "",
            subtitle: t.subtitle ?? "",
          },
          { onConflict: "banner_id,locale" }
        );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase.from("hero_banners").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
