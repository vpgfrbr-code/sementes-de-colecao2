import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getStaticMapUrl } from "@/lib/static-map";
import { OrderStatus } from "./order-status";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations("order");
  const { id } = await params;
  return { title: `${t("waitingPayment")} — #${id.slice(0, 8)}` };
}

export default async function OrderPage({ params }: Props) {
  const { id, locale } = await params;

  const supabase = createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (supabase as any)
    .from("orders")
    .select(
      "id, status, total_cents, subtotal_cents, discount_cents, total_brl_cents, pix_qr_code, pix_br_code, pix_expires_at, guest_email, customer_name, customer_cpf, address, created_at, customer_tz_offset, payment_proof_path, tracking_code, shipping_carrier, coupon_id"
    )
    .eq("id", id)
    .single();

  // Fallback: if the query failed (e.g. column doesn't exist yet), retry without payment_proof_path
  const orderData = order ?? (await supabase
    .from("orders")
    .select(
      "id, status, total_cents, subtotal_cents, discount_cents, total_brl_cents, pix_qr_code, pix_br_code, pix_expires_at, guest_email, customer_name, address, created_at, customer_tz_offset"
    )
    .eq("id", id)
    .single()).data;

  if (!orderData) notFound();

  // Build static map URL from cached coordinates (geocoded at checkout time)
  const addressData = orderData.address as Record<string, string> | null;
  let mapUrl: string | null = null;
  if (addressData?._lat && addressData?._lon) {
    const lat = parseFloat(addressData._lat);
    const lon = parseFloat(addressData._lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      mapUrl = getStaticMapUrl({ lat, lon });
    }
  }

  // Fetch order items
  const { data: rawItems } = await supabase
    .from("order_items")
    .select("id, quantity, unit_price_cents, product_id, variant_id")
    .eq("order_id", id);

  const productIds = (rawItems ?? []).map((i) => i.product_id).filter(Boolean) as string[];
  const variantIds = (rawItems ?? []).map((i) => i.variant_id).filter(Boolean) as string[];

  // Fetch coupon code if order has a coupon
  const couponId = (orderData as Record<string, unknown>).coupon_id as string | null;
  let couponCode: string | null = null;
  if (couponId) {
    const { data: coupon } = await supabase
      .from("coupons")
      .select("code")
      .eq("id", couponId)
      .single();
    couponCode = coupon?.code ?? null;
  }

  const [{ data: translationsData }, { data: variantsData }, { data: productsData }] =
    await Promise.all([
      supabase
        .from("product_translations")
        .select("product_id, name")
        .in("product_id", productIds)
        .eq("locale", locale),
      supabase
        .from("product_variants")
        .select("id, seed_count")
        .in("id", variantIds),
      supabase
        .from("products")
        .select("id, images")
        .in("id", productIds),
    ]);

  const nameMap = new Map((translationsData ?? []).map((t) => [t.product_id, t.name]));
  const variantMap = new Map((variantsData ?? []).map((v) => [v.id, v]));
  const imageMap = new Map(
    (productsData ?? []).map((p) => {
      const imgs = (p.images as string[] | null) ?? [];
      const firstImage =
        imgs.find((img) => !/\.(mp4|webm|mov)($|\?)/i.test(img)) ?? imgs[0] ?? null;
      return [p.id, firstImage];
    })
  );

  const items = (rawItems ?? []).map((item) => ({
    id: item.id,
    name: nameMap.get(item.product_id ?? "") ?? item.product_id?.slice(0, 8) ?? "—",
    variantLabel: variantMap.get(item.variant_id ?? "") ? `${variantMap.get(item.variant_id ?? "")!.seed_count} sem.` : "",
    quantity: item.quantity,
    unitPriceCents: item.unit_price_cents,
    image: imageMap.get(item.product_id ?? "") ?? null,
  }));

  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        <OrderStatus
          orderId={orderData.id}
          initialStatus={orderData.status}
          totalCents={orderData.total_cents}
          subtotalCents={orderData.subtotal_cents}
          discountCents={orderData.discount_cents ?? 0}
          totalBrlCents={orderData.total_brl_cents}
          pixBrCode={orderData.pix_br_code}
          pixExpiresAt={orderData.pix_expires_at}
          guestEmail={orderData.guest_email}
          customerName={orderData.customer_name}
          address={orderData.address as Record<string, string> | null}
          items={items}
          createdAt={orderData.created_at}
          customerTzOffset={
            ((orderData as Record<string, unknown>).customer_tz_offset as
              | number
              | null
              | undefined) ?? null
          }
          locale={locale}
          hasPaymentProof={!!("payment_proof_path" in orderData && orderData.payment_proof_path)}
          paymentProofPath={("payment_proof_path" in orderData ? (orderData.payment_proof_path as string | null) : null)}
          trackingCode={(orderData as Record<string, unknown>).tracking_code as string | null}
          shippingCarrier={(orderData as Record<string, unknown>).shipping_carrier as string | null}
          customerCpf={(orderData as Record<string, unknown>).customer_cpf as string | null}
          couponCode={couponCode}
          mapUrl={mapUrl}
        />
      </div>
    </section>
  );
}
