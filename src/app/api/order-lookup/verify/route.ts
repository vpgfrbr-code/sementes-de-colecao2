import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { SignJWT } from "jose";

function getJwtSecret(): Uint8Array {
  const raw =
    process.env.ORDER_LOOKUP_JWT_SECRET ?? process.env.CLERK_SECRET_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ORDER_LOOKUP_JWT_SECRET (or CLERK_SECRET_KEY) is required in production"
      );
    }
    return new TextEncoder().encode("dev-only-do-not-use-in-prod");
  }
  return new TextEncoder().encode(raw);
}

export async function POST(req: NextRequest) {
  let body: { email?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const code = body.code?.trim();

  if (!email || !code || code.length !== 6) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Find valid token
  const { data: tokens } = await supabase
    .from("order_lookup_tokens")
    .select("id, expires_at")
    .eq("email", email)
    .eq("token", code)
    .gte("expires_at", new Date().toISOString())
    .limit(1);

  if (!tokens || tokens.length === 0) {
    return NextResponse.json(
      { error: "Invalid or expired code" },
      { status: 401 }
    );
  }

  // Delete used token
  await supabase.from("order_lookup_tokens").delete().eq("id", tokens[0]!.id);

  // Generate JWT valid for 30 minutes
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30m")
    .setIssuedAt()
    .sign(getJwtSecret());

  return NextResponse.json({ token });
}
