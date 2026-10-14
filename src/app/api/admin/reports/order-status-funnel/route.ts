import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

const STATUS_ORDER = [
  "waiting_payment",
  "payment_reported",
  "approved",
  "shipped",
  "delivered",
  "cancelled",
];

const STATUS_LABELS: Record<string, string> = {
  waiting_payment: "Aguardando Pagamento",
  payment_reported: "Pagamento Reportado",
  approved: "Aprovado",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export async function GET() {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const supabase = createServerClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("status");

  if (!orders || orders.length === 0) {
    return NextResponse.json({ statuses: [], total: 0 });
  }

  const countMap = new Map<string, number>();
  for (const order of orders) {
    countMap.set(order.status, (countMap.get(order.status) ?? 0) + 1);
  }

  const total = orders.length;

  const statuses = STATUS_ORDER.map((status) => {
    const count = countMap.get(status) ?? 0;
    return {
      status,
      label: STATUS_LABELS[status] ?? status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  // Conversion rates
  const completed =
    (countMap.get("approved") ?? 0) +
    (countMap.get("shipped") ?? 0) +
    (countMap.get("delivered") ?? 0);

  const conversionRate =
    total > 0 ? Math.round((completed / total) * 100) : 0;

  const deliveryRate =
    completed > 0
      ? Math.round(
          ((countMap.get("delivered") ?? 0) / completed) * 100
        )
      : 0;

  return NextResponse.json({
    statuses,
    total,
    conversion_rate: conversionRate,
    delivery_rate: deliveryRate,
  });
}
