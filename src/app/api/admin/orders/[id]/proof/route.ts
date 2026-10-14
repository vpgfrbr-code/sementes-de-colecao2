import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;
  const supabase = createServerClient();

  const { data: order } = await supabase
    .from("orders")
    .select("payment_proof_path")
    .eq("id", id)
    .single();

  if (!order || !order.payment_proof_path) {
    return NextResponse.json(
      { error: "No payment proof found" },
      { status: 404 }
    );
  }

  const { data: signedUrlData, error } = await supabase.storage
    .from("payment-proofs")
    .createSignedUrl(order.payment_proof_path, 300); // 5 minutes

  if (error || !signedUrlData?.signedUrl) {
    return NextResponse.json(
      { error: "Failed to generate signed URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: signedUrlData.signedUrl });
}
