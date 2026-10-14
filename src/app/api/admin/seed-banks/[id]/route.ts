import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";
import type { Database } from "@/lib/supabase/types";

type SeedBankUpdate = Database["public"]["Tables"]["seed_banks"]["Update"];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;

  let body: {
    slug?: string;
    logo_url?: string;
    website?: string;
    translations?: { locale: string; name: string; description?: string }[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServerClient();

  const update: SeedBankUpdate = {};
  if (body.slug !== undefined) update.slug = body.slug;
  if (body.logo_url !== undefined) update.logo_url = body.logo_url;
  if (body.website !== undefined) update.website = body.website;

  if (Object.keys(update).length > 0) {
    const { error } = await supabase
      .from("seed_banks")
      .update(update)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (body.translations?.length) {
    for (const t of body.translations) {
      await supabase
        .from("seed_bank_translations")
        .upsert(
          {
            seed_bank_id: id,
            locale: t.locale,
            name: t.name,
            description: t.description ?? "",
          },
          { onConflict: "seed_bank_id,locale" }
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

  const { error } = await supabase.from("seed_banks").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
