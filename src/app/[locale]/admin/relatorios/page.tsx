"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Download,
  Loader2,
  Search,
  SlidersHorizontal,
  DollarSign,
  Tag,
  TrendingUp,
  MapPin,
  ShoppingCart,
  Package,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  Cell,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format-price";
import { CommissionPayoutDialog } from "../_components/commissions/commission-payout-dialog";
import { CommissionPayoutHistory } from "../_components/commissions/commission-payout-history";
import { DualPrice } from "../_components/commissions/dual-price";
import { AdminErrorState } from "../_components/ui/admin-error-state";
import { DashboardSkeleton } from "../_components/ui/admin-skeletons";
import { ResponsiveOverlay } from "../_components/ui/responsive-overlay";

/** Esconde a scrollbar das linhas de scroll horizontal no mobile. */
const SCROLLBAR_NONE =
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/**
 * Linha de KPIs: snap-scroll horizontal no mobile, grid original no md+.
 * Cards filhos precisam de `snap-start shrink-0 min-w-[72%] md:min-w-0`.
 */
const KPI_ROW_CLASS = `-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 ${SCROLLBAR_NONE} md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4`;

const KPI_CARD_CLASS = "snap-start shrink-0 min-w-[72%] md:min-w-0";

/* ── Types ── */

interface TopProduct {
  product_id: string;
  name: string;
  slug: string;
  image: string | null;
  quantity_sold: number;
  total_seeds: number;
  revenue_cents: number;
}

interface AvgTicketMonth {
  month: string;
  average_cents: number;
  order_count: number;
}

interface RegionState {
  state: string;
  state_name: string;
  order_count: number;
  revenue_cents: number;
}

interface RegionCity {
  city: string;
  state: string;
  order_count: number;
  revenue_cents: number;
}

interface RevenuePoint {
  period: string;
  revenue_cents: number;
  revenue_brl_cents: number;
  order_count: number;
}

interface StatusData {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

interface CouponData {
  coupon_id: string;
  code: string;
  type: string;
  value: number;
  active: boolean;
  is_reseller: boolean;
  reseller_name: string | null;
  total_uses: number;
  order_count: number;
  revenue_cents: number;
  discount_cents: number;
}

interface ResellerData {
  reseller_user_id: string | null;
  coupon_id: string | null;
  reseller_name: string;
  reseller_email: string;
  coupon_code: string;
  commission_percent: number;
  order_count: number;
  gross_sales: number;
  total_discounts: number;
  commission_value: number;
  paid_value: number;
  pending_value: number;
}

/* ── Chart configs ── */

const revenueChartConfig = {
  revenue: { label: "Receita (USD)", color: "var(--color-primary)" },
} satisfies ChartConfig;

const ticketChartConfig = {
  average: { label: "Ticket Médio", color: "var(--color-primary)" },
} satisfies ChartConfig;

const statusChartConfig = {
  count: { label: "Pedidos", color: "var(--color-primary)" },
} satisfies ChartConfig;

const regionChartConfig = {
  revenue: { label: "Receita (USD)", color: "var(--color-primary)" },
} satisfies ChartConfig;

const productChartConfig = {
  quantity: { label: "Packs", color: "var(--color-primary)" },
  seeds: { label: "Sementes", color: "var(--color-accent)" },
} satisfies ChartConfig;

/* ── Helpers ── */

function getDefaultDateRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

const STATUS_COLORS: Record<string, string> = {
  waiting_payment: "hsl(45, 93%, 47%)",
  payment_reported: "hsl(217, 91%, 60%)",
  approved: "hsl(142, 71%, 45%)",
  shipped: "hsl(142, 76%, 36%)",
  delivered: "hsl(142, 69%, 28%)",
  cancelled: "hsl(0, 84%, 60%)",
};

function doExportCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Main Component ── */

export default function AdminReportsPage() {
  const defaults = getDefaultDateRange();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Vira true após o primeiro carregamento bem-sucedido — controla skeleton.
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [granularity, setGranularity] = useState("day");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Data states
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [ticketData, setTicketData] = useState<AvgTicketMonth[]>([]);
  const [overallTicket, setOverallTicket] = useState(0);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [conversionRate, setConversionRate] = useState(0);
  const [deliveryRate, setDeliveryRate] = useState(0);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [stateData, setStateData] = useState<RegionState[]>([]);
  const [cityData, setCityData] = useState<RegionCity[]>([]);
  const [couponData, setCouponData] = useState<CouponData[]>([]);
  const [resellerData, setResellerData] = useState<ResellerData[]>([]);
  const [resellerTotals, setResellerTotals] = useState<{
    sales: number;
    discounts: number;
    commissions: number;
    paid: number;
    pending: number;
  }>({ sales: 0, discounts: 0, commissions: 0, paid: 0, pending: 0 });

  // Payout dialog state
  const [payoutTarget, setPayoutTarget] = useState<ResellerData | null>(null);
  const [payoutHistoryRefresh, setPayoutHistoryRefresh] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("granularity", granularity);

      const [
        revenueRes,
        ticketRes,
        statusRes,
        productsRes,
        regionsRes,
        couponsRes,
        resellerRes,
      ] = await Promise.all([
        fetch(`/api/admin/reports/revenue-over-time?${params}`),
        fetch(`/api/admin/reports/average-ticket?${params}`),
        fetch(`/api/admin/reports/order-status-funnel`),
        fetch(`/api/admin/reports/top-products?${params}&limit=20`),
        fetch(`/api/admin/reports/top-regions?${params}`),
        fetch(`/api/admin/reports/coupon-performance?${params}`),
        fetch(`/api/admin/reports/reseller?${params}`),
      ]);

      if (revenueRes.ok) {
        const d = await revenueRes.json();
        setRevenueData(d.data);
        setTotalRevenue(d.total_revenue);
      }
      if (ticketRes.ok) {
        const d = await ticketRes.json();
        setTicketData(d.by_month);
        setOverallTicket(d.overall);
      }
      if (statusRes.ok) {
        const d = await statusRes.json();
        setStatusData(d.statuses);
        setConversionRate(d.conversion_rate);
        setDeliveryRate(d.delivery_rate);
      }
      if (productsRes.ok) {
        const d = await productsRes.json();
        setTopProducts(d.products);
      }
      if (regionsRes.ok) {
        const d = await regionsRes.json();
        setStateData(d.by_state);
        setCityData(d.by_city);
      }
      if (couponsRes.ok) {
        const d = await couponsRes.json();
        setCouponData(d.coupons);
      }
      if (resellerRes.ok) {
        const d = await resellerRes.json();
        setResellerData(d.resellers);
        setResellerTotals(d.totals);
      }
      setHasLoaded(true);
    } catch {
      // Falha de rede: em vez de deixar a página "vazia" em silêncio,
      // mostramos o estado de erro com retry.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [from, to, granularity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtros fora do padrão (badge do botão "Filtros" no mobile).
  const activeFilterCount =
    (from !== defaults.from ? 1 : 0) + (to !== defaults.to ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground text-sm">
          Business Intelligence — vendas, produtos, regiões e cupons
        </p>
      </div>

      {/* Date Range Filter — inline no desktop, overlay no mobile */}
      <Card>
        <CardContent className="pt-6">
          <div className="hidden flex-wrap items-end gap-4 md:flex">
            <DateRangeFields
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
            />
            <Button onClick={fetchData} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Search className="mr-2 size-4" />
              )}
              Buscar
            </Button>
          </div>
          <Button
            variant="outline"
            className="h-11 w-full gap-2 md:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filtros
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 font-mono tabular-nums">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </CardContent>
      </Card>

      <ResponsiveOverlay
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filtros"
        footer={
          <Button
            className="h-11 w-full gap-2"
            disabled={loading}
            onClick={() => {
              setFiltersOpen(false);
              fetchData();
            }}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            Buscar
          </Button>
        }
      >
        <div className="grid gap-4 pb-2">
          <DateRangeFields
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
            inputClassName="h-11"
          />
        </div>
      </ResponsiveOverlay>

      {/* Skeleton no primeiro load, erro com retry, senão as tabs */}
      {!hasLoaded && !loadError ? (
        <DashboardSkeleton />
      ) : loadError ? (
        <AdminErrorState
          message="Não foi possível carregar os relatórios."
          onRetry={fetchData}
        />
      ) : (
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div
          className={`-mx-4 overflow-x-auto px-4 ${SCROLLBAR_NONE} md:mx-0 md:overflow-visible md:px-0`}
        >
          <TabsList className="flex w-max min-w-full md:grid md:w-full md:grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="regions">Regiões</TabsTrigger>
            <TabsTrigger value="coupons">Cupons</TabsTrigger>
          </TabsList>
        </div>

        {/* ═══ OVERVIEW TAB ═══ */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Summary cards — snap-scroll horizontal no mobile, grid no md+ */}
          <div className={KPI_ROW_CLASS}>
            <Card className={KPI_CARD_CLASS}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Receita Total
                </CardTitle>
                <DollarSign className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono">
                  {formatPrice(totalRevenue, "pt")}
                </p>
              </CardContent>
            </Card>
            <Card className={KPI_CARD_CLASS}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Ticket Médio
                </CardTitle>
                <ShoppingCart className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono">
                  {formatPrice(overallTicket, "pt")}
                </p>
              </CardContent>
            </Card>
            <Card className={KPI_CARD_CLASS}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Taxa Conversão
                </CardTitle>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground">
                  pedidos pagos / total
                </p>
              </CardContent>
            </Card>
            <Card className={KPI_CARD_CLASS}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Taxa Entrega
                </CardTitle>
                <Package className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{deliveryRate}%</p>
                <p className="text-xs text-muted-foreground">
                  entregues / pagos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue chart */}
          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base">Receita ao Longo do Tempo</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={granularity} onValueChange={setGranularity}>
                  <SelectTrigger className="w-28 h-8 text-xs max-md:min-h-11 max-md:flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Diário</SelectItem>
                    <SelectItem value="week">Semanal</SelectItem>
                    <SelectItem value="month">Mensal</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 flex-1 md:h-8 md:flex-none"
                  onClick={() =>
                    doExportCSV(
                      ["Período", "Receita (USD)", "Pedidos"],
                      revenueData.map((r) => [
                        r.period,
                        (r.revenue_cents / 100).toFixed(2),
                        r.order_count,
                      ]),
                      `receita-${from}-${to}.csv`
                    )
                  }
                  disabled={revenueData.length === 0}
                >
                  <Download className="mr-1 size-3" />
                  CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {revenueData.length === 0 ? (
                <EmptyState text="Nenhuma receita no período." />
              ) : (
                <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="period"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) =>
                        granularity === "month"
                          ? v
                          : v.slice(5)
                      }
                      fontSize={11}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`}
                      fontSize={11}
                      width={50}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            formatPrice(value as number, "pt")
                          }
                        />
                      }
                    />
                    <defs>
                      <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="revenue_cents"
                      stroke="var(--color-primary)"
                      fill="url(#fillRevenue)"
                      strokeWidth={2}
                      name="revenue"
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Ticket medio + Funnel side by side */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Average ticket trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Ticket Médio por Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ticketData.length === 0 ? (
                  <EmptyState text="Sem dados de ticket médio." />
                ) : (
                  <ChartContainer config={ticketChartConfig} className="h-[250px] w-full">
                    <BarChart data={ticketData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`}
                        fontSize={11}
                        width={50}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) =>
                              formatPrice(value as number, "pt")
                            }
                          />
                        }
                      />
                      <Bar
                        dataKey="average_cents"
                        fill="var(--color-primary)"
                        radius={[4, 4, 0, 0]}
                        name="average"
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Order status funnel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Funil de Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <EmptyState text="Sem dados de pedidos." />
                ) : (
                  <ChartContainer config={statusChartConfig} className="h-[250px] w-full">
                    <BarChart data={statusData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        width={130}
                      />
                      <Tooltip
                        formatter={(value, _name, props) => [
                          `${value} (${(props.payload as StatusData).percentage}%)`,
                          "Pedidos",
                        ]}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} name="count">
                        {statusData.map((entry) => (
                          <Cell
                            key={entry.status}
                            fill={STATUS_COLORS[entry.status] ?? "var(--color-primary)"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ PRODUCTS TAB ═══ */}
        <TabsContent value="products" className="space-y-6 mt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold">Produtos Mais Vendidos</h2>
            <Button
              variant="outline"
              size="sm"
              className="h-11 w-full md:h-8 md:w-auto"
              onClick={() =>
                doExportCSV(
                  ["Produto", "Packs", "Sementes", "Receita (USD)"],
                  topProducts.map((p) => [
                    p.name,
                    p.quantity_sold,
                    p.total_seeds,
                    (p.revenue_cents / 100).toFixed(2),
                  ]),
                  `top-produtos-${from}-${to}.csv`
                )
              }
              disabled={topProducts.length === 0}
            >
              <Download className="mr-1 size-3" />
              CSV
            </Button>
          </div>

          {topProducts.length === 0 ? (
            <EmptyState text="Nenhuma venda no período." />
          ) : (
            <>
              {/* Bar chart */}
              <Card>
                <CardContent className="pt-6">
                  <ChartContainer config={productChartConfig} className="h-[350px] w-full">
                    <BarChart
                      data={topProducts.slice(0, 10)}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        width={160}
                        tickFormatter={(v: string) =>
                          v.length > 22 ? `${v.slice(0, 22)}...` : v
                        }
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name, item) => {
                              const p = item.payload as TopProduct;
                              return (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-mono">{p.quantity_sold} packs</span>
                                  <span className="font-mono text-muted-foreground">{p.total_seeds} sementes</span>
                                </div>
                              );
                            }}
                          />
                        }
                      />
                      <Bar
                        dataKey="quantity_sold"
                        fill="var(--color-primary)"
                        radius={[0, 4, 4, 0]}
                        name="quantity"
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Table */}
              <Card>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px] text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="p-3 font-medium text-muted-foreground w-8">
                            #
                          </th>
                          <th className="p-3 font-medium text-muted-foreground">
                            Produto
                          </th>
                          <th className="p-3 font-medium text-muted-foreground text-right">
                            Packs
                          </th>
                          <th className="p-3 font-medium text-muted-foreground text-right">
                            Sementes
                          </th>
                          <th className="p-3 font-medium text-muted-foreground text-right">
                            Receita
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((p, idx) => (
                          <tr key={p.product_id} className="border-b last:border-0">
                            <td className="p-3 font-mono text-muted-foreground">
                              {idx + 1}
                            </td>
                            <td className="p-3 font-medium">{p.name}</td>
                            <td className="p-3 text-right font-mono">
                              {p.quantity_sold}
                            </td>
                            <td className="p-3 text-right font-mono">
                              {p.total_seeds}
                            </td>
                            <td className="p-3 text-right font-mono">
                              {formatPrice(p.revenue_cents, "pt")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══ REGIONS TAB ═══ */}
        <TabsContent value="regions" className="space-y-6 mt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold">Vendas por Região</h2>
            <Button
              variant="outline"
              size="sm"
              className="h-11 w-full md:h-8 md:w-auto"
              onClick={() =>
                doExportCSV(
                  ["Estado", "UF", "Pedidos", "Receita (USD)"],
                  stateData.map((s) => [
                    s.state_name,
                    s.state,
                    s.order_count,
                    (s.revenue_cents / 100).toFixed(2),
                  ]),
                  `regioes-${from}-${to}.csv`
                )
              }
              disabled={stateData.length === 0}
            >
              <Download className="mr-1 size-3" />
              CSV
            </Button>
          </div>

          {stateData.length === 0 ? (
            <EmptyState text="Nenhuma venda com endereço no período." />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* States chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="size-4" />
                    Por Estado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={regionChartConfig} className="h-[350px] w-full">
                    <BarChart
                      data={stateData.slice(0, 10)}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`}
                        fontSize={11}
                      />
                      <YAxis
                        type="category"
                        dataKey="state"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        width={40}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) =>
                              formatPrice(value as number, "pt")
                            }
                            labelFormatter={(label) => {
                              const found = stateData.find(
                                (s) => s.state === label
                              );
                              return found?.state_name ?? String(label);
                            }}
                          />
                        }
                      />
                      <Bar
                        dataKey="revenue_cents"
                        fill="var(--color-primary)"
                        radius={[0, 4, 4, 0]}
                        name="revenue"
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* States table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Ranking de Estados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="p-3 font-medium text-muted-foreground">
                            Estado
                          </th>
                          <th className="p-3 font-medium text-muted-foreground text-right">
                            Pedidos
                          </th>
                          <th className="p-3 font-medium text-muted-foreground text-right">
                            Receita
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {stateData.map((s) => (
                          <tr key={s.state} className="border-b last:border-0">
                            <td className="p-3">
                              <span className="font-medium">{s.state_name}</span>
                              <span className="ml-1 text-muted-foreground text-xs font-mono">
                                ({s.state})
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono">
                              {s.order_count}
                            </td>
                            <td className="p-3 text-right font-mono">
                              {formatPrice(s.revenue_cents, "pt")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Top Cities */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    Top Cidades
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="p-3 font-medium text-muted-foreground w-8">
                            #
                          </th>
                          <th className="p-3 font-medium text-muted-foreground">
                            Cidade
                          </th>
                          <th className="p-3 font-medium text-muted-foreground">
                            UF
                          </th>
                          <th className="p-3 font-medium text-muted-foreground text-right">
                            Pedidos
                          </th>
                          <th className="p-3 font-medium text-muted-foreground text-right">
                            Receita
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cityData.map((c, idx) => (
                          <tr key={`${c.city}-${c.state}`} className="border-b last:border-0">
                            <td className="p-3 font-mono text-muted-foreground">
                              {idx + 1}
                            </td>
                            <td className="p-3 font-medium">{c.city}</td>
                            <td className="p-3 font-mono text-xs">{c.state}</td>
                            <td className="p-3 text-right font-mono">
                              {c.order_count}
                            </td>
                            <td className="p-3 text-right font-mono">
                              {formatPrice(c.revenue_cents, "pt")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ═══ COUPONS TAB ═══ */}
        <TabsContent value="coupons" className="space-y-6 mt-6">
          {/* Coupon Performance */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold">Performance de Cupons</h2>
            <Button
              variant="outline"
              size="sm"
              className="h-11 w-full md:h-8 md:w-auto"
              onClick={() =>
                doExportCSV(
                  ["Cupom", "Usos", "Pedidos", "Receita (USD)", "Desconto (USD)", "Revendedor"],
                  couponData.map((c) => [
                    c.code,
                    c.total_uses,
                    c.order_count,
                    (c.revenue_cents / 100).toFixed(2),
                    (c.discount_cents / 100).toFixed(2),
                    c.reseller_name ?? "",
                  ]),
                  `cupons-${from}-${to}.csv`
                )
              }
              disabled={couponData.length === 0}
            >
              <Download className="mr-1 size-3" />
              CSV
            </Button>
          </div>

          {couponData.length === 0 ? (
            <EmptyState text="Nenhum cupom utilizado no período." />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-3 font-medium text-muted-foreground">
                          Cupom
                        </th>
                        <th className="p-3 font-medium text-muted-foreground">
                          Tipo
                        </th>
                        <th className="p-3 font-medium text-muted-foreground text-right">
                          Usos
                        </th>
                        <th className="p-3 font-medium text-muted-foreground text-right">
                          Pedidos
                        </th>
                        <th className="p-3 font-medium text-muted-foreground text-right">
                          Receita
                        </th>
                        <th className="p-3 font-medium text-muted-foreground text-right">
                          Desconto
                        </th>
                        <th className="p-3 font-medium text-muted-foreground">
                          Revendedor
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {couponData.map((c) => (
                        <tr key={c.coupon_id} className="border-b last:border-0">
                          <td className="p-3">
                            <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                              {c.code}
                            </code>
                            {!c.active && (
                              <span className="ml-2 text-[10px] text-muted-foreground">
                                INATIVO
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-xs">
                            {c.type === "percentage"
                              ? `${c.value}%`
                              : formatPrice(c.value, "pt")}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {c.total_uses}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {c.order_count}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {formatPrice(c.revenue_cents, "pt")}
                          </td>
                          <td className="p-3 text-right font-mono text-destructive">
                            {c.discount_cents > 0 && "-"}
                            {formatPrice(c.discount_cents, "pt")}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {c.reseller_name ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reseller Commission Sub-section */}
          {resellerData.length > 0 && (
            <>
              <div className="pt-4 border-t">
                <h2 className="text-lg font-semibold">
                  Comissões de Revendedores
                </h2>
                <p className="text-muted-foreground text-sm">
                  Vendas, descontos e comissões por revendedor
                </p>
              </div>

              {/* Reseller summary cards — snap-scroll no mobile, grid no md+ */}
              <div className={KPI_ROW_CLASS}>
                <Card className={KPI_CARD_CLASS}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Vendas Brutas
                    </CardTitle>
                    <DollarSign className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      <DualPrice usdCents={resellerTotals.sales} align="left" />
                    </div>
                  </CardContent>
                </Card>
                <Card className={KPI_CARD_CLASS}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Comissão (período)
                    </CardTitle>
                    <Users className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      <DualPrice
                        usdCents={resellerTotals.commissions}
                        align="left"
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card className={KPI_CARD_CLASS}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Pago (período)
                    </CardTitle>
                    <Wallet className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
                      <DualPrice usdCents={resellerTotals.paid} align="left" />
                    </div>
                  </CardContent>
                </Card>
                <Card className={KPI_CARD_CLASS}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Pendente (total)
                    </CardTitle>
                    <Tag className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      <DualPrice
                        usdCents={resellerTotals.pending}
                        align="left"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Reseller table */}
              <Card>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="p-3 font-medium text-muted-foreground">
                            Revendedor
                          </th>
                          <th className="p-3 font-medium text-muted-foreground">
                            Cupom
                          </th>
                          <th className="p-3 font-medium text-muted-foreground text-right">
                            Pedidos
                          </th>
                          <th className="p-3 font-medium text-muted-foreground text-right">
                            Vendas
                          </th>
                          <th className="p-3 font-medium text-muted-foreground text-right">
                            Comissão %
                          </th>
                          <th className="p-3 font-medium text-muted-foreground text-right">
                            Comissão
                          </th>
                          <th className="p-3 font-medium text-muted-foreground text-right">
                            Pago
                          </th>
                          <th className="p-3 font-medium text-muted-foreground text-right">
                            Pendente
                          </th>
                          <th className="p-3 font-medium text-muted-foreground text-right">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {resellerData.map((r, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="p-3">
                              <p className="font-medium">{r.reseller_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {r.reseller_email}
                              </p>
                            </td>
                            <td className="p-3">
                              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                {r.coupon_code}
                              </code>
                            </td>
                            <td className="p-3 text-right">{r.order_count}</td>
                            <td className="p-3 text-right">
                              <DualPrice usdCents={r.gross_sales} />
                            </td>
                            <td className="p-3 text-right">
                              {r.commission_percent}%
                            </td>
                            <td className="p-3 text-right font-medium">
                              <DualPrice usdCents={r.commission_value} />
                            </td>
                            <td className="p-3 text-right text-emerald-600 dark:text-emerald-500">
                              <DualPrice usdCents={r.paid_value} />
                            </td>
                            <td className="p-3 text-right font-medium text-primary">
                              <DualPrice usdCents={r.pending_value} />
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-11 md:h-8"
                                disabled={r.pending_value <= 0}
                                onClick={() => setPayoutTarget(r)}
                              >
                                <Wallet className="size-3.5 mr-1" />
                                Pagar
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Payment history */}
              <CommissionPayoutHistory
                from={from}
                to={to}
                refreshKey={payoutHistoryRefresh}
                onChanged={fetchData}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
      )}

      {/* Payout dialog */}
      {payoutTarget && (
        <CommissionPayoutDialog
          open={!!payoutTarget}
          onOpenChange={(open) => {
            if (!open) setPayoutTarget(null);
          }}
          resellerName={payoutTarget.reseller_name}
          couponCode={payoutTarget.coupon_code}
          resellerUserId={payoutTarget.reseller_user_id}
          couponId={payoutTarget.coupon_id}
          onSuccess={() => {
            setPayoutHistoryRefresh((k) => k + 1);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

/* ── Filtros de período ──
   Campos compartilhados entre a linha inline (desktop) e o overlay
   (mobile) — o estado vive na página, então os dois ficam sincronizados. */

function DateRangeFields({
  from,
  to,
  onFromChange,
  onToChange,
  inputClassName,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  inputClassName?: string;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>De</Label>
        <Input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="space-y-2">
        <Label>Até</Label>
        <Input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className={inputClassName}
        />
      </div>
    </>
  );
}

/* ── Empty State ── */

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <BarChart3 className="size-12 text-muted-foreground/30" />
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  );
}
