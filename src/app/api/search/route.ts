import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const locale = searchParams.get("locale") || "pt";

  if (!query || query.trim() === "") {
    return NextResponse.json({ results: [] });
  }

  // Normalize query: lowercase + strip diacritics (so "maracuruja" matches "Maracurujá")
  const normalizedQuery = query
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const supabase = createServerClient();

  // Search against the generated name_unaccented column so accent-stripped queries match
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      slug,
      images,
      product_translations!inner(name, description),
      product_variants(price_cents)
    `)
    .eq("active", true)
    .eq("product_translations.locale", locale)
    .ilike("product_translations.name_unaccented", `%${normalizedQuery}%`)
    .limit(6);

  if (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Failed to fetch search results" }, { status: 500 });
  }

  return NextResponse.json({ results: data });
}
