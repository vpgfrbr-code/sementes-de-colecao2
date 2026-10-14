import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { CheckoutSchema } from "@/lib/schemas/checkout";
import { calculateDiscountedPrice, isPromotionActive } from "@/lib/format-price";
import { generatePixBrCode } from "@/lib/pix";
import { findBalancedCoupon } from "@/lib/coupon-balance";
import { geocodeAddress } from "@/lib/static-map";
import { grantOrderAccess } from "@/lib/order-access";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { log } from "@/lib/log";
import { getDefaultResellerAttribution } from "@/lib/app-settings";
import { getEffectiveBrlRate } from "@/lib/exchange-rate-server";
import { notifyPaymentApproverOfPendingOrder } from "@/lib/admin-notifications";
import { randomUUID } from "crypto";

// Allow up to 30s for checkout so slow external calls (Nominatim geocoding,
// exchange rate API) never cause an iOS Safari "Load failed" on the client.
export const maxDuration = 30;

function getPixKey(): string {
  // Defaults to the merchant's production PIX key. Can be overridden via env.
  return process.env.PIX_KEY ?? "Vpgfrbr@gmail.com";
}

export async function POST(req: NextRequest) {
  try {
    return await handleCheckout(req);
  } catch (err) {
    // Top-level safety net: any unhandled throw (missing env var, DB outage,
    // PIX edge case) returns JSON so the client never sees a Safari "did not
    // match the expected pattern" from an empty 500 body.
    log.error("[checkout] unhandled error:", err);
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleCheckout(req: NextRequest) {
  // Rate limit: 10 checkouts / min / IP. Generous for legit users (they
  // retry on network errors), tight enough to stop abuse.
  const rl = await rateLimit(`checkout:${getClientIp(req)}`, 10, 60);
  if (!rl.allowed) return rl.response!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, name, cpf, clerkUserId, couponCode, address, items, customerTzOffset } = parsed.data;
  const supabase = createServerClient();

  // 1. Fetch variant prices from DB (NEVER trust client prices)
  const variantIds = items.map((i) => i.variantId);
  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("id, product_id, seed_count, price_cents, stock")
    .in("id", variantIds)
    .eq("active", true);

  if (variantsError || !variants || variants.length !== items.length) {
    return NextResponse.json(
      { error: "One or more variants not found" },
      { status: 400 }
    );
  }

  // Fetch shipping from products table (fixed per product) + promotion fields + stock + product_type
  const productIds = [...new Set(variants.map((v) => v.product_id))];
  const { data: products } = await supabase
    .from("products")
    .select("id, stock, shipping_cents, on_sale, discount_type, discount_value, sale_ends_at, variant_discounts_enabled, product_type")
    .in("id", productIds);

  const productMap = new Map(
    (products ?? []).map((p) => [p.id, p])
  );

  // Fetch bundle components for any bundle products in this cart
  const bundleProductIds = (products ?? [])
    .filter((p) => p.product_type === "bundle")
    .map((p) => p.id);

  type BundleComponent = { bundle_product_id: string; component_product_id: string; seed_count: number };
  let bundleComponents: BundleComponent[] = [];
  if (bundleProductIds.length > 0) {
    const { data: components } = await supabase
      .from("bundle_components")
      .select("bundle_product_id, component_product_id, seed_count")
      .in("bundle_product_id", bundleProductIds);
    bundleComponents = (components ?? []) as BundleComponent[];

    // Extend productMap to include component products (needed for stock validation)
    const componentIds = bundleComponents.map((c) => c.component_product_id);
    const missingIds = componentIds.filter((id) => !productMap.has(id));
    if (missingIds.length > 0) {
      const { data: componentProducts } = await supabase
        .from("products")
        .select("id, stock, shipping_cents, on_sale, discount_type, discount_value, sale_ends_at, variant_discounts_enabled, product_type")
        .in("id", missingIds);
      for (const cp of componentProducts ?? []) {
        productMap.set(cp.id, cp);
      }
    }
  }

  // Also fetch variant-level discount fields for variant_discounts_enabled products
  const variantDiscountIds = variants.map((v) => v.id);
  const { data: variantDiscounts } = await supabase
    .from("product_variants")
    .select("id, on_sale, discount_type, discount_value, sale_ends_at")
    .in("id", variantDiscountIds);

  const variantDiscountMap = new Map(
    (variantDiscounts ?? []).map((v) => [v.id, v])
  );

  // 2. Validate stock and calculate subtotal server-side
  let subtotalCents = 0;
  let totalShippingCents = 0;
  const orderItems: {
    product_id: string;
    variant_id: string;
    quantity: number;
    unit_price_cents: number;
  }[] = [];

  // Aggregate seed demand per product for stock validation.
  // For bundle products, demand is distributed across their components
  // (the bundle itself has no physical stock).
  const seedDemandByProduct = new Map<string, number>();
  for (const item of items) {
    const variant = variants.find((v) => v.id === item.variantId);
    if (!variant) {
      return NextResponse.json(
        { error: `Variant ${item.variantId} not found` },
        { status: 400 }
      );
    }
    const product = productMap.get(variant.product_id);
    if (product?.product_type === "bundle") {
      // Expand into component demand — ignore variant.seed_count for bundles
      const components = bundleComponents.filter(
        (c) => c.bundle_product_id === variant.product_id
      );
      for (const comp of components) {
        seedDemandByProduct.set(
          comp.component_product_id,
          (seedDemandByProduct.get(comp.component_product_id) ?? 0) +
            comp.seed_count * item.quantity
        );
      }
    } else {
      const seedsNeeded = variant.seed_count * item.quantity;
      seedDemandByProduct.set(
        variant.product_id,
        (seedDemandByProduct.get(variant.product_id) ?? 0) + seedsNeeded
      );
    }
  }

  // Validate product-level stock (total seeds)
  for (const [productId, seedsNeeded] of seedDemandByProduct) {
    const product = productMap.get(productId);
    if (!product || product.stock < seedsNeeded) {
      return NextResponse.json(
        { error: "Estoque insuficiente" },
        { status: 400 }
      );
    }
  }

  for (const item of items) {
    const variant = variants.find((v) => v.id === item.variantId)!;

    const product = productMap.get(variant.product_id);
    const shipping = product?.shipping_cents ?? 0;

    // Apply sale discount: variant-level or product-level
    let unitPrice = variant.price_cents;
    if (product?.variant_discounts_enabled) {
      const vd = variantDiscountMap.get(variant.id);
      if (vd && isPromotionActive(vd.on_sale, vd.sale_ends_at)) {
        unitPrice = calculateDiscountedPrice(variant.price_cents, vd.discount_type as "percentage" | "fixed", vd.discount_value);
      }
    } else if (product && isPromotionActive(product.on_sale, product.sale_ends_at)) {
      unitPrice = calculateDiscountedPrice(variant.price_cents, product.discount_type as "percentage" | "fixed", product.discount_value);
    }

    const lineCents = unitPrice * item.quantity;
    subtotalCents += lineCents;
    totalShippingCents = Math.max(totalShippingCents, shipping);
    orderItems.push({
      product_id: variant.product_id,
      variant_id: item.variantId,
      quantity: item.quantity,
      unit_price_cents: unitPrice,
    });
  }

  const grossCents = subtotalCents + totalShippingCents;

  // 3. Validate coupon server-side (never trust client discount)
  let couponId: string | null = null;
  let discountCents = 0;
  let originalCouponCode: string | null = null;

  if (couponCode) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: coupon } = await (supabase as any)
      .from("coupons")
      .select("id, code, type, value, min_order_cents, apply_to_shipping, max_uses, max_uses_per_user, used_count, active, expires_at")
      .eq("code", couponCode.toUpperCase())
      .eq("active", true)
      .single();

    let userOrdersCount = 0;
    if (coupon && coupon.max_uses_per_user !== null) {
      if (clerkUserId) {
        const { count } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("coupon_id", coupon.id)
          .eq("clerk_user_id", clerkUserId)
          .in("status", ["approved", "shipped", "delivered"]);
        userOrdersCount = count ?? 0;
      } else if (email) {
        const { count } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("coupon_id", coupon.id)
          .eq("guest_email", email.trim().toLowerCase())
          .in("status", ["approved", "shipped", "delivered"]);
        userOrdersCount = count ?? 0;
      }
    }

    let reservedCount = 0;
    if (coupon && coupon.max_uses !== null) {
      const { count } = await supabase
        .from("coupon_usage_reservations")
        .select("*", { count: "exact", head: true })
        .eq("coupon_id", coupon.id)
        .eq("status", "reserved");
      reservedCount = count ?? 0;
    }

    if (
      coupon &&
      (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) &&
      (coupon.max_uses === null || (coupon.used_count + reservedCount) < coupon.max_uses) &&
      (coupon.max_uses_per_user === null || userOrdersCount < coupon.max_uses_per_user) &&
      subtotalCents + totalShippingCents >= coupon.min_order_cents
    ) {
      couponId = coupon.id;
      const discountBase = coupon.apply_to_shipping ? grossCents : subtotalCents;
      if (coupon.type === "percentage") {
        discountCents = Math.round((discountBase * coupon.value) / 100);
      } else {
        discountCents = Math.min(coupon.value, discountBase);
      }

      // Balance group rotation: swap to coupon with lowest sales
      const { couponId: balancedId, swapped } = await findBalancedCoupon(supabase, coupon);
      if (swapped) {
        couponId = balancedId;
        originalCouponCode = coupon.code;
      }
    }
    // If coupon is invalid, we silently ignore it (don't block checkout)
  }

  const totalCents = grossCents - discountCents;

  // Default reseller attribution: when no coupon is applied, optionally
  // attribute the order to a configured reseller for commission reporting.
  // Does NOT change pricing.
  let manualResellerUserId: string | null = null;
  let manualCommissionPercent: number | null = null;
  if (!couponId) {
    try {
      const setting = await getDefaultResellerAttribution();
      if (setting.enabled && setting.reseller_user_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: reseller } = await (supabase as any)
          .from("resellers")
          .select("user_id, status")
          .eq("user_id", setting.reseller_user_id)
          .single();
        if (reseller && reseller.status === "active") {
          manualResellerUserId = setting.reseller_user_id;
          manualCommissionPercent = setting.commission_percent;
        } else {
          log.warn(
            "Default reseller attribution skipped: reseller missing/inactive",
            { reseller_user_id: setting.reseller_user_id }
          );
        }
      }
    } catch (err) {
      log.error("Failed to read default reseller attribution setting:", err);
    }
  }

  // 4. Fetch exchange rate and geocode address in parallel (geocoding is best-effort)
  const [effectiveRate, coords] = await Promise.all([
    getEffectiveBrlRate(),
    geocodeAddress(address).catch(() => null),
  ]);
  const exchangeRate = effectiveRate.rate;
  const totalBrlCents = Math.round(totalCents * exchangeRate);

  // Enrich address with geocoded coordinates (for static map on confirmation page)
  const enrichedAddress = coords
    ? { ...address, _lat: String(coords.lat), _lon: String(coords.lon) }
    : address;

  // 5. Generate correlation ID for order deduplication
  const correlationId = randomUUID();

  // Generate PIX BR code (EMV QR / copia e cola) — dynamic amount from cart.
  // Customer still uploads proof; admin confirms in the dashboard.
  const pixBrCode = generatePixBrCode({
    key: getPixKey(),
    amountBrlCents: totalBrlCents,
    merchantName: "N",
    merchantCity: "C",
    txId: "SEMENTESDECOLECAO",
  });

  // 6. Save order to Supabase
  const pixExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: orderError } = await (supabase as any)
    .from("orders")
    .insert({
      clerk_user_id: clerkUserId ?? null,
      guest_email: clerkUserId ? null : email,
      customer_name: name,
      customer_cpf: cpf,
      address: enrichedAddress,
      subtotal_cents: grossCents,
      discount_cents: discountCents,
      total_cents: totalCents,
      exchange_rate_used: exchangeRate,
      total_brl_cents: totalBrlCents,
      coupon_id: couponId,
      original_coupon_code: originalCouponCode,
      status: "waiting_payment",
      woovi_charge_id: null,
      woovi_correlation_id: correlationId,
      pix_qr_code: null,
      pix_br_code: pixBrCode,
      pix_expires_at: pixExpiresAt,
      manual_reseller_user_id: manualResellerUserId,
      manual_commission_percent: manualCommissionPercent,
      manual_reseller_assigned_at: manualResellerUserId
        ? new Date().toISOString()
        : null,
      customer_tz_offset: customerTzOffset ?? null,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    log.error("Order creation failed:", orderError);
    return NextResponse.json(
      { error: "Order creation failed" },
      { status: 500 }
    );
  }

  // Reserve coupon slot at checkout (used_count is confirmed only on approval).
  if (couponId) {
    try {
      await supabase.rpc("reserve_coupon_usage", {
        p_coupon_id: couponId,
        p_order_id: order.id,
      });
    } catch (err) {
      log.error("Coupon reservation failed:", err);
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { error: "Cupom indisponivel no momento" },
        { status: 400 }
      );
    }
  }

  // 7. Insert order items
  const { error: itemsError } = await supabase.from("order_items").insert(
    orderItems.map((item) => ({ ...item, order_id: order.id }))
  );

  if (itemsError) {
    log.error("Order items creation failed:", itemsError);
  }

  // Reserve stock atomically (deduct seeds from product stock)
  for (const [productId, seedsNeeded] of seedDemandByProduct) {
    try {
      await supabase.rpc("reserve_product_stock", {
        p_product_id: productId,
        p_seed_quantity: seedsNeeded,
      });
    } catch (err) {
      log.error("Stock reservation failed:", err);
      // Rollback: delete order and restore any already-reserved stock
      await supabase.from("order_items").delete().eq("order_id", order.id);
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { error: "Estoque insuficiente" },
        { status: 400 }
      );
    }
  }

  // Bind this browser to the order so subsequent calls to /status,
  // /report-payment and /upload-proof can verify ownership for guest checkouts.
  await grantOrderAccess(order.id);

  // Notify payment approver admin of the new pending order (fire-and-forget)
  notifyPaymentApproverOfPendingOrder(supabase, order.id).catch(() => null);

  // Persist customer's timezone offset to Clerk publicMetadata for future
  // sessions / server-side emails. Fire-and-forget; never blocks checkout.
  if (clerkUserId && typeof customerTzOffset === "number") {
    (async () => {
      try {
        const client = await clerkClient();
        const u = await client.users.getUser(clerkUserId);
        await client.users.updateUserMetadata(clerkUserId, {
          publicMetadata: {
            ...u.publicMetadata,
            timezoneOffset: customerTzOffset,
          },
        });
      } catch {
        // Non-critical; checkout already succeeded.
      }
    })();
  }

  return NextResponse.json({ orderId: order.id });
}
