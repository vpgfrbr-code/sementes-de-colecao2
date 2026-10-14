import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;

  let body: { action?: "approve" | "reject"; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = createServerClient();

  const update =
    body.action === "approve"
      ? {
          approved: true,
          approved_at: new Date().toISOString(),
          approved_by: adminResult.userId,
          rejected_reason: null,
        }
      : {
          approved: false,
          approved_at: null,
          approved_by: null,
          rejected_reason: body.reason?.trim() || "Rejected",
        };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("product_reviews")
    .update(update)
    .eq("id", id);

  if (error) {
    console.error("[admin/reviews/moderate] failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  const { error } = await supabase.from("product_reviews").delete().eq("id", id);

  if (error) {
    console.error("[admin/reviews/delete] failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
