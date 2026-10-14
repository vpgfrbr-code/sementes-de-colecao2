import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { sendLookupCodeEmail } from "@/lib/resend";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { randomInt } from "crypto";

const RequestSchema = z.object({ email: z.string().email().max(254) });

export async function POST(req: NextRequest) {
  // Block email-bomb attacks: 5 lookup requests / min / IP, in addition to
  // the existing per-email limit (3/hour) enforced below.
  const rl = await rateLimit(`lookup:${getClientIp(req)}`, 5, 60);
  if (!rl.allowed) return rl.response!;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();

  const supabase = createServerClient();

  // Rate limit: max 3 requests per email per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("order_lookup_tokens")
    .select("*", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", oneHourAgo);

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  // Check if there are any orders for this email
  const { count: orderCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("guest_email", email);

  // Always return success to prevent email enumeration
  // But only send code if orders exist
  if ((orderCount ?? 0) > 0) {
    const code = String(randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabase.from("order_lookup_tokens").insert({
      email,
      token: code,
      expires_at: expiresAt,
    });

    try {
      await sendLookupCodeEmail({ to: email, code });
    } catch (err) {
      console.error("[order-lookup] Failed to send code:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
