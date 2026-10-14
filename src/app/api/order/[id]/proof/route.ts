import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyOrderAccess } from "@/lib/order-access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const access = await verifyOrderAccess(id);
  if (!access.ok) return access.response;

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
    .createSignedUrl(order.payment_proof_path, 300);

  if (error || !signedUrlData?.signedUrl) {
    return NextResponse.json(
      { error: "Failed to generate signed URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: signedUrlData.signedUrl });
}
