import type { createServerClient } from "@/lib/supabase/server";
import { sendAdminNewOrderEmail, sendPaymentApproverEmail } from "@/lib/resend";
import { getClerkEmail } from "@/lib/clerk";
import { log } from "@/lib/log";
import { formatOrderDateForAdmin } from "@/lib/format-date";

type Supabase = ReturnType<typeof createServerClient>;

interface AddressShape {
  name?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  zip?: string | null;
  country?: string | null;
  email?: string | null;
}

function getAppUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "https://sementesdecolecao.com";
  return raw.replace(/\/$/, "");
}

function formatAddress(address: AddressShape | null): string {
  if (!address) return "(sem endereco)";
  const line1 = [address.street, address.number].filter(Boolean).join(", ");
  const line2 = address.complement ?? "";
  const line3 = address.neighborhood ?? "";
  const line4 = [address.city, address.state].filter(Boolean).join(" - ");
  const line5 = [address.cep ?? address.zip, address.country].filter(Boolean).join(" - ");
  return [line1, line2, line3, line4, line5].filter(Boolean).join("\n");
}

/**
 * Sends a notification email to the superadmin for a newly approved order.
 *
 * Never throws: all failures are logged and swallowed so webhook fulfillment
 * and the customer-facing flow are unaffected.
 */
export async function notifySuperadminOfNewOrder(
  supabase: Supabase,
  orderId: string
): Promise<void> {
  try {
    const { data: order, error } = await (supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: string) => {
            maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
          };
        };
      };
    })
      .from("orders")
      .select(
        "id, clerk_user_id, guest_email, customer_name, address, subtotal_cents, total_cents, total_brl_cents, exchange_rate_used, created_at, woovi_correlation_id, coupon_id, manual_reseller_user_id, manual_commission_percent"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) {
      log.warn("[admin-notify] order not found", { orderId });
      return;
    }

    const o = order as {
      id: string;
      clerk_user_id: string | null;
      guest_email: string | null;
      customer_name: string | null;
      address: AddressShape | null;
      subtotal_cents: number | null;
      total_cents: number;
      total_brl_cents: number | null;
      exchange_rate_used: number | null;
      created_at: string;
      woovi_correlation_id: string | null;
      coupon_id: string | null;
      manual_reseller_user_id: string | null;
      manual_commission_percent: number | null;
    };

    const { data: itemsRaw } = await supabase
      .from("order_items")
      .select("quantity, unit_price_cents, products(slug, product_translations(name, locale))")
      .eq("order_id", orderId);

    const items = ((itemsRaw ?? []) as unknown as Array<{
      quantity: number;
      unit_price_cents: number;
      products: {
        slug: string;
        product_translations: Array<{ name: string; locale: string }>;
      } | null;
    }>).map((row) => {
      const translations = row.products?.product_translations ?? [];
      const pt = translations.find((t) => t.locale === "pt");
      const fallback = translations[0];
      const name = pt?.name ?? fallback?.name ?? row.products?.slug ?? "Produto";
      return {
        name,
        quantity: row.quantity,
        unitPriceCents: row.unit_price_cents,
      };
    });

    // Orders persist USD cents in total_cents/subtotal_cents/unit_price_cents,
    // with the converted BRL total in total_brl_cents (exchange_rate_used).
    // Admin operates in BRL (PIX is paid in R$, dashboard shows R$), so
    // convert before sending the email to avoid showing "R$" next to USD
    // values.
    const rate = o.exchange_rate_used ?? 1;
    const toBrl = (cents: number) => Math.round(cents * rate);
    const totalBrlCents = o.total_brl_cents ?? toBrl(o.total_cents);
    const subtotalBrlCents = toBrl(o.subtotal_cents ?? o.total_cents);
    const itemsBrl = items.map((it) => ({
      ...it,
      unitPriceCents: toBrl(it.unitPriceCents),
    }));

    let couponCode: string | null = null;
    if (o.coupon_id) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("code")
        .eq("id", o.coupon_id)
        .maybeSingle();
      couponCode = (coupon as { code?: string } | null)?.code ?? null;
    }

    let manualResellerEmail: string | null = null;
    if (o.manual_reseller_user_id) {
      try {
        manualResellerEmail = await getClerkEmail(o.manual_reseller_user_id);
      } catch (err) {
        log.warn("[admin-notify] failed to resolve reseller email", err);
      }
    }

    const customerEmail =
      o.guest_email ?? (await getClerkEmail(o.clerk_user_id)) ?? "(sem email)";

    const customerName =
      o.customer_name ??
      o.address?.name ??
      (customerEmail !== "(sem email)" ? customerEmail : "Cliente");

    const appUrl = getAppUrl();
    const adminUrl = `${appUrl}/pt/admin/pedidos/${orderId}`;

    const createdAt = formatOrderDateForAdmin(o.created_at, "pt");

    const paymentMethod = o.woovi_correlation_id ? "PIX (Woovi)" : "PIX / Outros";

    await sendAdminNewOrderEmail({
      orderId: o.id,
      orderShortId: o.id.slice(0, 8),
      createdAt,
      customerName,
      customerEmail,
      subtotalCents: subtotalBrlCents,
      totalCents: totalBrlCents,
      currency: "BRL",
      paymentMethod,
      couponCode,
      manualResellerEmail,
      manualCommissionPercent: o.manual_commission_percent,
      shippingAddress: formatAddress(o.address),
      items: itemsBrl,
      adminUrl,
    });
  } catch (err) {
    log.error("[admin-notify] failed to notify superadmin of new order", err);
  }
}

/**
 * Sends a simple notification email to the payment approver admin when a new
 * order is placed and is awaiting manual payment confirmation.
 *
 * Never throws: all failures are logged and swallowed.
 */
export async function notifyPaymentApproverOfPendingOrder(
  supabase: Supabase,
  orderId: string
): Promise<void> {
  try {
    const { data: order, error } = await (supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: string) => {
            maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
          };
        };
      };
    })
      .from("orders")
      .select("id, total_cents, total_brl_cents, exchange_rate_used")
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) {
      log.warn("[payment-approver-notify] order not found", { orderId });
      return;
    }

    const o = order as {
      id: string;
      total_cents: number;
      total_brl_cents: number | null;
      exchange_rate_used: number | null;
    };
    const appUrl = getAppUrl();
    const adminUrl = `${appUrl}/pt/admin/pedidos/${orderId}`;

    // total_cents is USD cents; the customer pays the BRL-converted amount
    // via PIX. Send that BRL value so the email matches what's actually
    // being approved.
    const totalBrlCents =
      o.total_brl_cents ??
      Math.round(o.total_cents * (o.exchange_rate_used ?? 1));

    await sendPaymentApproverEmail({
      orderId: o.id,
      orderShortId: o.id.slice(0, 8),
      totalCents: totalBrlCents,
      currency: "BRL",
      adminUrl,
    });
  } catch (err) {
    log.error("[payment-approver-notify] failed to notify payment approver", err);
  }
}
