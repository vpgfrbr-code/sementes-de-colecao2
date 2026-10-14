import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET() {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const supabase = createServerClient();

  const { data: products, error } = await supabase
    .from("products")
    .select(
      "id, slug, product_translations!inner(name)"
    )
    .eq("product_translations.locale", "pt")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const options = (products ?? []).map((p) => ({
    label: (p.product_translations as unknown as { name: string }[])[0]?.name ?? p.slug,
    value: `/produto/${p.slug}`,
  }));

  return NextResponse.json(options);
}
