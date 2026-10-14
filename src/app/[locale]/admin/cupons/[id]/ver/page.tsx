"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  CalendarX2,
  ChevronLeft,
  Loader2,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Truck,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/format-price";
import { PayCommissionButton } from "../../../_components/commissions/pay-commission-button";

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  min_order_cents: number;
  max_uses: number | null;
  max_uses_per_user: number | null;
  used_count: number;
  reseller_user_id: string | null;
  reseller_name: string | null;
  reseller_email: string | null;
  commission_percent: number | null;
  apply_to_shipping: boolean;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface Order {
  id: string;
  status: string;
  total_cents: number;
  subtotal_cents: number;
  discount_cents: number;
  customer_name: string | null;
  clerk_user_id: string | null;
  guest_email: string | null;
  created_at: string;
}

interface Summary {
  order_count: number;
  total_discount_cents: number;
  total_sales_cents: number;
}

interface CouponDetail {
  coupon: Coupon;
  orders: Order[];
  summary: Summary;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  waiting_payment: "Aguardando Pagamento",
  payment_reported: "Pagamento Reportado",
  approved: "Aprovado",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const ORDER_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  waiting_payment: "outline",
  payment_reported: "default",
  approved: "default",
  shipped: "secondary",
  delivered: "secondary",
  cancelled: "destructive",
};

function formatExpiry(dateStr: string, locale: string) {
  const d = new Date(dateStr);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return d.toLocaleString(locale === "pt" ? "pt-BR" : locale === "es" ? "es-ES" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
    timeZoneName: "short",
  });
}

function orderCustomerLabel(order: Order): string {
  if (order.customer_name) return order.customer_name;
  if (order.guest_email) return order.guest_email;
  if (order.clerk_user_id) return order.clerk_user_id.slice(0, 18) + "…";
  return "—";
}

export default function AdminCouponViewPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const locale = useLocale();
  const [id, setId] = useState<string | null>(null);
  const [data, setData] = useState<CouponDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/admin/coupons/${id}`)
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (res.ok) setData(await res.json());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/admin/cupons`}>
            <ChevronLeft className="mr-1 size-4" />
            Cupons
          </Link>
        </Button>
        <p className="text-muted-foreground">Cupom não encontrado.</p>
      </div>
    );
  }

  const { coupon, orders, summary } = data;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={`/${locale}/admin/cupons`}>
            <ChevronLeft className="mr-1 size-4" />
            Cupons
          </Link>
        </Button>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground/60">
              <Tag className="size-4" />
            </div>
            <div>
              <h1 className="font-mono text-2xl font-bold tracking-widest">
                {coupon.code}
              </h1>
              <p className="text-sm text-muted-foreground">
                {coupon.type === "percentage"
                  ? `${coupon.value}% de desconto`
                  : `${formatPrice(coupon.value, locale)} de desconto`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={coupon.active ? "default" : "outline"}>
              {coupon.active ? "Ativo" : "Inativo"}
            </Badge>
            {coupon.commission_percent != null && coupon.commission_percent > 0 && (
              <Badge variant="outline" className="font-mono text-xs">
                {coupon.commission_percent}% comissão
              </Badge>
            )}
            {coupon.commission_percent != null && coupon.commission_percent > 0 && (
              <PayCommissionButton
                resellerName={
                  coupon.reseller_name ??
                  coupon.reseller_user_id ??
                  coupon.code
                }
                resellerUserId={null}
                couponId={coupon.id}
                couponCode={coupon.code}
                variant="full"
              />
            )}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-bold">{summary.order_count}</p>
            {coupon.max_uses != null && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                de {coupon.max_uses} permitidos
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Desconto Concedido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-bold">
              {formatPrice(summary.total_discount_cents, locale)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vendas com Cupom</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-bold text-primary">
              {formatPrice(summary.total_sales_cents, locale)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Coupon details */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Detalhes
        </h2>
        <Card>
          <CardContent className="space-y-2 pt-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Tag className="size-3.5 shrink-0" />
              <span>
                {summary.order_count} uso{summary.order_count !== 1 ? "s" : ""}
                {coupon.max_uses ? ` de ${coupon.max_uses}` : ""}
                {coupon.max_uses_per_user
                  ? ` · máx ${coupon.max_uses_per_user}/conta`
                  : ""}
              </span>
            </div>

            {coupon.min_order_cents > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ShoppingCart className="size-3.5 shrink-0" />
                <span>Pedido mínimo: {formatPrice(coupon.min_order_cents, locale)}</span>
              </div>
            )}

            {coupon.apply_to_shipping && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Truck className="size-3.5 shrink-0" />
                <span>Desconto aplicado no frete</span>
              </div>
            )}

            {coupon.expires_at && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarX2 className="size-3.5 shrink-0" />
                <span>Expira em {formatExpiry(coupon.expires_at, locale)}</span>
              </div>
            )}

            {(coupon.reseller_name || coupon.reseller_user_id) && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="size-3.5 shrink-0" />
                <span>
                  Revendedor:{" "}
                  <span className="font-medium text-foreground">
                    {coupon.reseller_name ?? coupon.reseller_user_id}
                  </span>
                  {coupon.reseller_email && (
                    <span className="ml-1 text-muted-foreground">
                      ({coupon.reseller_email})
                    </span>
                  )}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Orders */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Pedidos com este cupom
        </h2>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <ShoppingBag className="size-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Data</th>
                      <th className="px-4 py-3 font-medium">Pedido</th>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium text-right">Total</th>
                      <th className="px-4 py-3 font-medium text-right">Desconto</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="transition-colors hover:bg-muted/40"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString(
                            locale === "pt" ? "pt-BR" : locale === "es" ? "es-ES" : "en-US"
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {order.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="max-w-[160px] truncate px-4 py-3 text-xs">
                          {orderCustomerLabel(order)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                          {formatPrice(order.total_cents, locale)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-muted-foreground">
                          -{formatPrice(order.discount_cents, locale)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={ORDER_STATUS_VARIANT[order.status] ?? "outline"}
                            className="text-xs"
                          >
                            {ORDER_STATUS_LABELS[order.status] ?? order.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
