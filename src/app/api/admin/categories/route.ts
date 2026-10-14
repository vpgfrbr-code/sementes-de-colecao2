import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET() {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("categories")
    .select(
      `id, slug, created_at,
       category_translations(locale, name, description)`
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  let body: {
    slug: string;
    translations: { locale: string; name: string; description?: string }[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.slug || !body.translations?.length) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data: category, error: catError } = await supabase
    .from("categories")
    .insert({ slug: body.slug })
    .select("id")
    .single();

  if (catError || !category) {
    return NextResponse.json(
      { error: catError?.message ?? "Failed to create category" },
      { status: 500 }
    );
  }

  const { error: transError } = await supabase
    .from("category_translations")
    .insert(
      body.translations.map((t) => ({
        category_id: category.id,
        locale: t.locale,
        name: t.name,
        description: t.description ?? "",
      }))
    );

  if (transError) {
    console.error("Category translation insert failed:", transError);
  }

  return NextResponse.json({ id: category.id }, { status: 201 });
}
