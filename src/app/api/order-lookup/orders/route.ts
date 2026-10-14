import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { jwtVerify } from "jose";

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

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const token = authHeader.slice(7);

  let email: string;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    email = payload.email as string;
    if (!email) throw new Error("No email in token");
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  const supabase = createServerClient();

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id, status, total_cents, created_at, customer_tz_offset,
      order_items(
        id, quantity, unit_price_cents,
        products(slug, images, product_translations(name, locale)),
        product_variants(seed_count)
      )
    `)
    .eq("guest_email", email)
    .order("created_at", { ascending: false });

  return NextResponse.json({ orders: orders ?? [] });
}
