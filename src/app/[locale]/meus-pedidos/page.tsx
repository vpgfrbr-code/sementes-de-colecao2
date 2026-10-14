import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { OrderList } from "./order-list";
import { AccountShell } from "@/components/account/account-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("myOrders") };
}

export default async function MyOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { userId } = await auth();
  const { locale } = await params;

  // Unauthenticated users go to the email lookup flow
  if (!userId) {
    redirect(`/${locale}/meus-pedidos/buscar`);
  }

  const supabase = createServerClient();

  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      id, status, total_cents, created_at, customer_tz_offset,
      tracking_code, shipping_carrier,
      order_items(
        id, quantity, unit_price_cents,
        products(slug, images, product_translations(name, locale)),
        product_variants(seed_count)
      )
    `,
    )
    .eq("clerk_user_id", userId)
    .order("created_at", { ascending: false });

  const t = await getTranslations("account");

  return (
    <AccountShell
      heading={t("myOrders")}
      description={t("ordersDescription")}
    >
      <OrderList orders={orders ?? []} />
    </AccountShell>
  );
}
