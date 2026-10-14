import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;

  let body: {
    slug?: string;
    translations?: { locale: string; name: string; description?: string }[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServerClient();

  if (body.slug) {
    const { error } = await supabase
      .from("categories")
      .update({ slug: body.slug })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (body.translations?.length) {
    for (const t of body.translations) {
      await supabase
        .from("category_translations")
        .upsert(
          {
            category_id: id,
            locale: t.locale,
            name: t.name,
            description: t.description ?? "",
          },
          { onConflict: "category_id,locale" }
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

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
