import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendReviewInviteEmail } from "@/lib/resend";
import { signReviewInviteToken } from "@/lib/review-token";
import { log } from "@/lib/log";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sementesdecolecao.com";

// Send a review-invite email to customers 7 days after their order was shipped
// or delivered, if we haven't already.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    log.error("[cron] CRON_SECRET env var is not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, customer_name, guest_email, clerk_user_id, updated_at")
    .in("status", ["shipped", "delivered"])
    .is("review_invite_sent_at", null)
    .lt("updated_at", sevenDaysAgo)
    .limit(50);

  if (error) {
    log.error("[cron] review-invites list failed:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  if (!orders || orders.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const order of orders) {
    // Resolve recipient email — prefer guest_email; for logged-in users
    // we don't have an email on orders, so we skip (avoids Clerk API calls in cron).
    const email = order.guest_email;
    if (!email) {
      skipped++;
      // still mark as sent to avoid re-processing logged-in orders every run
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("orders")
        .update({ review_invite_sent_at: new Date().toISOString() })
        .eq("id", order.id);
      continue;
    }

    try {
      const token = await signReviewInviteToken({
        orderId: order.id,
        email: email.toLowerCase(),
      });
      const reviewUrl = `${SITE_URL}/pt/avaliar/${order.id}?token=${token}`;

      await sendReviewInviteEmail({
        to: email,
        customerName: order.customer_name ?? "",
        orderId: order.id,
        reviewUrl,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("orders")
        .update({ review_invite_sent_at: new Date().toISOString() })
        .eq("id", order.id);

      sent++;
    } catch (err) {
      log.error(`[cron] review-invite failed for order ${order.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ sent, skipped, failed, total: orders.length });
}
