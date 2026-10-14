import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "@/lib/supabase/server";
import { sendOrderConfirmationEmail } from "@/lib/resend";
import { notifySuperadminOfNewOrder } from "@/lib/admin-notifications";
import { getClerkEmail } from "@/lib/clerk";
import { log } from "@/lib/log";

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.WOOVI_WEBHOOK_SECRET;
  if (!secret) return true; // Skip verification in dev/mock mode

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const expected = hmac.digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

async function fulfillOrder(orderId: string, email: string | null) {
  const supabase = createServerClient();

  try {
    await supabase.rpc("confirm_coupon_usage", { p_order_id: orderId });
  } catch (err) {
    console.error("[webhook] Failed to confirm coupon usage:", err);
  }

  // Stock was already reserved at checkout — no decrement needed here

  // Send confirmation email
  if (email) {
    try {
      await sendOrderConfirmationEmail({ to: email, orderId });
    } catch (err) {
      log.error("[webhook] Failed to send confirmation email:", err);
    }
  }

  // Notify superadmin (never blocks fulfillment)
  await notifySuperadminOfNewOrder(supabase, orderId);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; charge?: { correlationID?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only process completed charges
  if (event.event !== "OPENPIX:CHARGE_COMPLETED") {
    return NextResponse.json({ ok: true });
  }

  const correlationId = event.charge?.correlationID;
  if (!correlationId) {
    return NextResponse.json(
      { error: "Missing correlationID" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Idempotent update — only transitions waiting_payment → approved
  const { data: order, error } = await supabase
    .from("orders")
    .update({ status: "approved" })
    .eq("woovi_correlation_id", correlationId)
    .eq("status", "waiting_payment")
    .select("id, guest_email, clerk_user_id")
    .single();

  if (error || !order) {
    // Already processed or not found — return 200 to avoid retries
    return NextResponse.json({ ok: true });
  }

  // Resolve recipient email
  const email =
    order.guest_email ?? (await getClerkEmail(order.clerk_user_id));

  await fulfillOrder(order.id, email);

  return NextResponse.json({ ok: true });
}
