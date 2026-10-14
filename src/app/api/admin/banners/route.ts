import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET() {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("hero_banners")
    .select("id, image_url, image_url_mobile, media_type, link, sort_order, active, created_at, hero_banner_translations(locale, title, subtitle)")
    .order("sort_order");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  let body: {
    image_url: string;
    image_url_mobile?: string | null;
    media_type?: string;
    link?: string;
    sort_order?: number;
    active?: boolean;
    translations: { locale: string; title?: string; subtitle?: string }[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.image_url) {
    return NextResponse.json({ error: "Missing image_url" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: banner, error: bannerError } = await supabase
    .from("hero_banners")
    .insert({
      image_url: body.image_url,
      image_url_mobile: body.image_url_mobile ?? null,
      media_type: body.media_type ?? "image",
      link: body.link ?? "",
      sort_order: body.sort_order ?? 0,
      active: body.active ?? true,
    })
    .select("id")
    .single();

  if (bannerError || !banner) {
    return NextResponse.json(
      { error: bannerError?.message ?? "Failed to create banner" },
      { status: 500 }
    );
  }

  if (body.translations?.length) {
    const { error: transError } = await supabase
      .from("hero_banner_translations")
      .insert(
        body.translations.map((t) => ({
          banner_id: banner.id,
          locale: t.locale,
          title: t.title ?? "",
          subtitle: t.subtitle ?? "",
        }))
      );

    if (transError) {
      console.error("Banner translation insert failed:", transError);
    }
  }

  return NextResponse.json({ id: banner.id }, { status: 201 });
}
