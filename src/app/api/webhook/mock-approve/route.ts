import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendOrderConfirmationEmail } from "@/lib/resend";
import { notifySuperadminOfNewOrder } from "@/lib/admin-notifications";
import { getClerkEmail } from "@/lib/clerk";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  let body: { orderId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { orderId } = body;
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Idempotent — only transitions waiting_payment → approved
  const { data: order, error } = await supabase
    .from("orders")
    .update({ status: "approved" })
    .eq("id", orderId)
    .eq("status", "waiting_payment")
    .select("id, guest_email, clerk_user_id")
    .single();

  if (error || !order) {
    return NextResponse.json(
      { error: "Order not found or already approved" },
      { status: 404 }
    );
  }

  try {
    await supabase.rpc("confirm_coupon_usage", { p_order_id: order.id });
  } catch (err) {
    console.error("[mock-approve] Failed to confirm coupon usage:", err);
  }

  // Stock was already reserved at checkout — no decrement needed here

  // Send confirmation email
  const email =
    order.guest_email ?? (await getClerkEmail(order.clerk_user_id));

  if (email) {
    try {
      await sendOrderConfirmationEmail({ to: email, orderId: order.id });
    } catch (err) {
      console.error("[mock-approve] Failed to send email:", err);
    }
  }

  // Notify superadmin (never blocks)
  await notifySuperadminOfNewOrder(supabase, order.id);

  return NextResponse.json({ ok: true, status: "approved" });
}
