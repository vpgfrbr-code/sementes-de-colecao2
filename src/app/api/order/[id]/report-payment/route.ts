import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyOrderAccess } from "@/lib/order-access";
import { log } from "@/lib/log";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const access = await verifyOrderAccess(id);
  if (!access.ok) return access.response;

  const supabase = createServerClient();

  // Fetch current order
  const { data: order } = await supabase
    .from("orders")
    .select("status, pix_expires_at")
    .eq("id", id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "waiting_payment") {
    return NextResponse.json(
      { error: "Order is not awaiting payment" },
      { status: 409 }
    );
  }

  // Check expiry
  if (order.pix_expires_at && new Date(order.pix_expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Payment window has expired" },
      { status: 410 }
    );
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "payment_reported" })
    .eq("id", id)
    .eq("status", "waiting_payment"); // idempotent guard

  if (error) {
    log.error("[report-payment] Supabase update failed:", {
      orderId: id,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json(
      { error: `Update failed: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
