import { createServerClient } from "@/lib/supabase/server";
import { requireAdminPage } from "@/lib/admin";
import { maskName, maskEmail } from "@/lib/pii";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminRecentOrderRow } from "./_components/admin-recent-order-row";
import { DashboardInsights } from "./_components/dashboard-insights";
import { DashboardShell } from "./_components/dashboard-shell";
import { LowStockAlert } from "./_components/low-stock-alert";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Defense in depth: layout already gates, but in App Router layouts and
  // pages render in parallel, so the Supabase query below would otherwise
  // execute before the layout's redirect takes effect.
  await requireAdminPage(locale);

  const supabase = createServerClient();

  const { data: recentOrdersRaw } = await supabase
    .from("orders")
    .select(
      "id, status, total_cents, total_brl_cents, customer_name, guest_email, payment_proof_path, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(5);

  // Mask PII in the listing — admins drill into the order detail page to see
  // full name/email. Reduces accidental exposure on shared screens.
  const recentOrders = recentOrdersRaw?.map((o) => ({
    ...o,
    customer_name: maskName(o.customer_name),
    guest_email: o.guest_email ? maskEmail(o.guest_email) : null,
  }));

  return (
    <DashboardShell locale={locale}>
      {/* Client-side insights: compact cards + sparkline + top lists */}
      <DashboardInsights />

      {/* Low stock alert */}
      <LowStockAlert locale={locale} />

      {/* Recent orders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders && recentOrders.length > 0 ? (
            <div className="divide-y">
              {recentOrders.map((order) => (
                <AdminRecentOrderRow key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum pedido ainda.
            </p>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
