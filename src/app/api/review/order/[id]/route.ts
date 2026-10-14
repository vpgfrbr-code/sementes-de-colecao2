import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyReviewInviteToken } from "@/lib/review-token";

// GET — load order items + any existing reviews for the review page.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const tokenData = await verifyReviewInviteToken(token);
  if (!tokenData || tokenData.orderId !== orderId) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, customer_name, guest_email, clerk_user_id")
    .eq("id", orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!["shipped", "delivered", "approved"].includes(order.status)) {
    return NextResponse.json(
      { error: "Order not eligible for review yet" },
      { status: 400 }
    );
  }

  // Fetch order items (distinct products) with translations
  const { data: items } = await supabase
    .from("order_items")
    .select(
      "product_id, products(slug, product_translations(locale, name))"
    )
    .eq("order_id", orderId);

  // Existing reviews for this order
  const { data: existingReviews } = await supabase
    .from("product_reviews")
    .select("product_id, rating, title, body, approved")
    .eq("order_id", orderId);

  const productMap = new Map<
    string,
    { productId: string; slug: string; name: string }
  >();
  for (const item of items ?? []) {
    if (productMap.has(item.product_id)) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const product = item.products as any;
    const translation =
      product?.product_translations?.find(
        (t: { locale: string }) => t.locale === "pt"
      ) ?? product?.product_translations?.[0];
    productMap.set(item.product_id, {
      productId: item.product_id,
      slug: product?.slug ?? "",
      name: translation?.name ?? "",
    });
  }

  return NextResponse.json({
    order: {
      id: order.id,
      customerName: order.customer_name,
    },
    products: Array.from(productMap.values()),
    existingReviews: existingReviews ?? [],
  });
}

// POST — submit a review (one per product per order)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const tokenData = await verifyReviewInviteToken(token);
  if (!tokenData || tokenData.orderId !== orderId) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  let body: {
    productId?: string;
    rating?: number;
    title?: string;
    body?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { productId, rating, title, body: reviewBody } = body;

  if (!productId || typeof productId !== "string") {
    return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  }
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Rating must be 1-5" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Verify the product actually belongs to this order
  const { data: orderItem } = await supabase
    .from("order_items")
    .select("id")
    .eq("order_id", orderId)
    .eq("product_id", productId)
    .limit(1)
    .maybeSingle();

  if (!orderItem) {
    return NextResponse.json(
      { error: "Product not found in order" },
      { status: 400 }
    );
  }

  // Fetch order for author info
  const { data: order } = await supabase
    .from("orders")
    .select("customer_name, guest_email, clerk_user_id, status")
    .eq("id", orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!["shipped", "delivered", "approved"].includes(order.status)) {
    return NextResponse.json(
      { error: "Order not eligible for review yet" },
      { status: 400 }
    );
  }

  // Upsert: allow replacement of existing review for same (order, product)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("product_reviews")
    .upsert(
      {
        product_id: productId,
        order_id: orderId,
        clerk_user_id: order.clerk_user_id,
        guest_email: order.guest_email ?? tokenData.email,
        author_name: order.customer_name ?? "Cliente",
        rating,
        title: title?.trim() || null,
        body: reviewBody?.trim() || null,
        approved: false,
        approved_at: null,
        approved_by: null,
      },
      { onConflict: "order_id,product_id" }
    );

  if (error) {
    console.error("[review/submit] upsert failed:", error);
    return NextResponse.json(
      { error: `Failed to save review: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
