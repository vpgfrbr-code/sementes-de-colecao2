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

  const { data, error } = await supabase
    .from("orders")
    .select("status")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ status: data.status });
}
