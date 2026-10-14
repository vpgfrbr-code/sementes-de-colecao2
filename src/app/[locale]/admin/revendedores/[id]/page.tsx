"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { ChevronLeft, Loader2, ShoppingBag, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/format-price";
import { PayCommissionButton } from "../../_components/commissions/pay-commission-button";

interface Reseller {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  status: "pending" | "active" | "inactive";
  notes: string;
  created_at: string;
  activated_at: string | null;
}

interface Coupon {
  id: string;
  code: string;
  commission_percent: number | null;
  type: string;
  value: number;
  active: boolean;
}

interface Order {
  id: string;
  status: string;
  total_cents: number;
  subtotal_cents: number;
  discount_cents: number;
  coupon_id: string;
  created_at: string;
}

interface Summary {
  order_count: number;
  total_sales_cents: number;
  total_commission_cents: number;
}

interface ResellerDetail {
  reseller: Reseller;
  coupons: Coupon[];
  orders: Order[];
  summary: Summary;
}

const STATUS_LABELS: Record<Reseller["status"], string> = {
  pending: "Pendente",
  active: "Ativo",
  inactive: "Inativo",
};

const STATUS_VARIANT: Record<Reseller["status"], "outline" | "default" | "secondary"> = {
  pending: "outline",
  active: "default",
  inactive: "secondary",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  waiting_payment: "Aguardando Pagamento",
  payment_reported: "Pagamento Reportado",
  approved: "Aprovado",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const ORDER_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  waiting_payment: "outline",
  payment_reported: "default",
  approved: "default",
  shipped: "secondary",
  delivered: "secondary",
  cancelled: "destructive",
};

export default function AdminResellerDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const locale = useLocale();
  const [id, setId] = useState<string | null>(null);
  const [data, setData] = useState<ResellerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [brlRate, setBrlRate] = useState<number | null>(null);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/admin/resellers/${id}`)
      .then(async (res) => {
        if (res.status === 404) { setNotFound(true); return; }
        if (res.ok) setData(await res.json());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetch("/api/exchange-rate")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const rate = typeof json?.brl === "number" ? json.brl : null;
        if (rate && rate > 0) setBrlRate(rate);
      })
      .catch(() => {});
  }, []);

  const formatBrl = (cents: number) => {
    if (!brlRate) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format((cents / 100) * brlRate);
  };

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
          <Link href={`/${locale}/admin/revendedores`}>
            <ChevronLeft className="mr-1 size-4" />
            Revendedores
          </Link>
        </Button>
        <p className="text-muted-foreground">Revendedor não encontrado.</p>
      </div>
    );
  }

  const { reseller, coupons, orders, summary } = data;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={`/${locale}/admin/revendedores`}>
            <ChevronLeft className="mr-1 size-4" />
            Revendedores
          </Link>
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground/60">
              <Users className="size-4" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{reseller.display_name}</h1>
              <p className="text-sm text-muted-foreground">{reseller.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={STATUS_VARIANT[reseller.status]} className="w-fit">
              {STATUS_LABELS[reseller.status]}
            </Badge>
            {reseller.status === "active" && (
              <PayCommissionButton
                resellerName={reseller.display_name}
                resellerUserId={reseller.user_id}
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{summary.order_count}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vendas Líquidas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">
              {formatPrice(summary.total_sales_cents, locale)}
            </p>
            {formatBrl(summary.total_sales_cents) && (
              <p className="mt-1 text-xs font-mono text-muted-foreground">
                ≈ {formatBrl(summary.total_sales_cents)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comissão Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono text-primary">
              {formatPrice(summary.total_commission_cents, locale)}
            </p>
            {formatBrl(summary.total_commission_cents) && (
              <p className="mt-1 text-xs font-mono text-muted-foreground">
                ≈ {formatBrl(summary.total_commission_cents)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coupons */}
      {coupons.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Cupons
          </h2>
          <div className="flex flex-wrap gap-2">
            {coupons.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
              >
                <span className="font-mono font-semibold">{c.code}</span>
                {c.commission_percent != null && c.commission_percent > 0 && (
                  <span className="text-muted-foreground">
                    {c.commission_percent}% comissão
                  </span>
                )}
                {!c.active && (
                  <Badge variant="secondary" className="text-[10px]">
                    Inativo
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Orders */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Pedidos com cupom do revendedor
        </h2>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <ShoppingBag className="size-10 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">Nenhum pedido encontrado.</p>
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
                      <th className="px-4 py-3 font-medium">Cupom</th>
                      <th className="px-4 py-3 font-medium text-right">Total</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((order) => {
                      const coupon = coupons.find((c) => c.id === order.coupon_id);
                      return (
                        <tr key={order.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {new Date(order.created_at).toLocaleDateString(
                              locale === "pt" ? "pt-BR" : locale === "es" ? "es-ES" : "en-US"
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {order.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {coupon?.code ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-right whitespace-nowrap">
                            {formatPrice(order.total_cents, locale)}
                            {formatBrl(order.total_cents) && (
                              <span className="block text-[11px] text-muted-foreground">
                                ≈ {formatBrl(order.total_cents)}
                              </span>
                            )}
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
                      );
                    })}
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
