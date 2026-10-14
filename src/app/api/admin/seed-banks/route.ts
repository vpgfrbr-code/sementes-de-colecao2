import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET() {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("seed_banks")
    .select("id, slug, logo_url, website, seed_bank_translations(locale, name, description)")
    .order("slug");

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
    logo_url?: string;
    website?: string;
    translations: { locale: string; name: string; description?: string }[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.slug || !body.translations?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: bank, error: bankError } = await supabase
    .from("seed_banks")
    .insert({
      slug: body.slug,
      logo_url: body.logo_url ?? "",
      website: body.website ?? "",
    })
    .select("id")
    .single();

  if (bankError || !bank) {
    return NextResponse.json(
      { error: bankError?.message ?? "Failed to create seed bank" },
      { status: 500 }
    );
  }

  const { error: transError } = await supabase
    .from("seed_bank_translations")
    .insert(
      body.translations.map((t) => ({
        seed_bank_id: bank.id,
        locale: t.locale,
        name: t.name,
        description: t.description ?? "",
      }))
    );

  if (transError) {
    console.error("Seed bank translation insert failed:", transError);
  }

  return NextResponse.json({ id: bank.id }, { status: 201 });
}
