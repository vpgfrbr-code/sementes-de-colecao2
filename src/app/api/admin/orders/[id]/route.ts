import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";
import { sendOrderConfirmationEmail, sendOrderShippedEmail } from "@/lib/resend";
import { notifySuperadminOfNewOrder } from "@/lib/admin-notifications";
import { getClerkEmail } from "@/lib/clerk";
import { restoreOrderStock } from "@/lib/restore-order-stock";
import type { Database } from "@/lib/supabase/types";

async function fulfillOrder(orderId: string, supabase: ReturnType<typeof createServerClient>) {
  const { data: order } = await supabase
    .from("orders")
    .select("guest_email, clerk_user_id")
    .eq("id", orderId)
    .single();

  // Stock was already reserved at checkout — no decrement needed here

  // Send confirmation email
  const email = order?.guest_email ?? (await getClerkEmail(order?.clerk_user_id ?? null));
  if (email) {
    try {
      await sendOrderConfirmationEmail({ to: email, orderId });
    } catch (err) {
      console.error("[admin] Failed to send confirmation email:", err);
    }
  }

  // Notify superadmin of manual approval (never blocks)
  await notifySuperadminOfNewOrder(supabase, orderId);
}

async function confirmOrderCouponUsage(orderId: string, supabase: ReturnType<typeof createServerClient>) {
  try {
    await supabase.rpc("confirm_coupon_usage", { p_order_id: orderId });
  } catch (err) {
    console.error("[admin] confirm_coupon_usage failed:", err);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;
  const supabase = createServerClient();

  const [orderResult, itemsResult] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).single(),
    supabase
      .from("order_items")
      .select(
        `id, quantity, unit_price_cents,
         products(slug, images, product_translations(name, locale)),
         product_variants(seed_count)`
      )
      .eq("order_id", id),
  ]);

  if (orderResult.error || !orderResult.data) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (itemsResult.error) {
    return NextResponse.json({ error: itemsResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    order: orderResult.data,
    items: itemsResult.data ?? [],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;

  let body: { status?: string; address?: Record<string, string>; tracking_code?: string; shipping_carrier?: string; internal_notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};

  if (body.status) {
    const validStatuses = [
      "waiting_payment",
      "payment_reported",
      "approved",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }
    updates.status = body.status;
  }

  if (body.address) {
    updates.address = body.address;
  }

  if (body.tracking_code !== undefined) {
    updates.tracking_code = body.tracking_code;
  }

  if (body.shipping_carrier !== undefined) {
    updates.shipping_carrier = body.shipping_carrier;
  }

  if (body.internal_notes !== undefined) {
    updates.internal_notes = body.internal_notes;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  // Fetch current status before updating (for fulfillment side-effects)
  const { data: currentOrder } = await supabase
    .from("orders")
    .select("status")
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("orders")
    .update(updates as Database["public"]["Tables"]["orders"]["Update"])
    .eq("id", id)
    .select("id, status")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  // Run fulfillment side-effects when transitioning to approved
  if (body.status === "approved" && (currentOrder?.status === "waiting_payment" || currentOrder?.status === "payment_reported")) {
    (async () => {
      await confirmOrderCouponUsage(id, supabase);
      await fulfillOrder(id, supabase);
    })().catch((err) => console.error("[admin] approval side-effects failed:", err));
  }

  // Restore stock when cancelling an active order (stock was reserved at checkout)
  if (body.status === "cancelled" && currentOrder?.status !== "cancelled") {
    (async () => {
      try {
        await supabase.rpc("release_coupon_usage_reservation", { p_order_id: id });
      } catch (err) {
        console.error("[admin] release_coupon_usage_reservation failed:", err);
      }
    })();
    restoreOrderStock(id, supabase).catch((err) =>
      console.error("[admin] restoreOrderStock failed:", err)
    );
  }

  // Send shipment notification when transitioning to shipped with a tracking code
  if (body.status === "shipped" && currentOrder?.status !== "shipped" && body.tracking_code) {
    (async () => {
      const { data: orderData } = await supabase
        .from("orders")
        .select("guest_email, clerk_user_id")
        .eq("id", id)
        .single();

      const email = orderData?.guest_email ?? (await getClerkEmail(orderData?.clerk_user_id ?? null));
      if (email) {
        try {
          const orderUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://sementesdecolecao.com"}/pt/pedido/${id}`;
          await sendOrderShippedEmail({
            to: email,
            orderId: id,
            trackingCode: body.tracking_code!,
            shippingCarrier: body.shipping_carrier,
            orderUrl,
          });
        } catch (err) {
          console.error("[admin] Failed to send shipped email:", err);
        }
      }
    })().catch((err) => console.error("[admin] shipping side-effects failed:", err));
  }

  return NextResponse.json(data);
}
