import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const status = req.nextUrl.searchParams.get("status") ?? "pending"; // pending | approved | all

  const supabase = createServerClient();

  let query = supabase
    .from("product_reviews")
    .select(
      `id, product_id, order_id, author_name, rating, title, body,
       approved, approved_at, approved_by, rejected_reason, created_at,
       products!inner(slug, product_translations(locale, name))`
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status === "pending") query = query.eq("approved", false).is("rejected_reason", null);
  else if (status === "approved") query = query.eq("approved", true);

  const { data, error } = await query;

  if (error) {
    console.error("[admin/reviews] list failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reviews: data ?? [] });
}
