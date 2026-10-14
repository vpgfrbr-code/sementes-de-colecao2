import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET() {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `id, slug, images, featured_order, active,
       product_translations(locale, name)`
    )
    .eq("is_featured", true)
    .order("featured_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  let body: { items: { id: string; featured_order: number }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.items?.length) {
    return NextResponse.json({ error: "Missing items" }, { status: 400 });
  }

  const supabase = createServerClient();

  for (const item of body.items) {
    const { error } = await supabase
      .from("products")
      .update({ featured_order: item.featured_order })
      .eq("id", item.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
