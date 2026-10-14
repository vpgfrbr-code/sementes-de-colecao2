"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { motion } from "motion/react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  MapPin,
} from "lucide-react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { NumberTicker } from "@/components/ui/number-ticker";
import { formatPrice } from "@/lib/format-price";
import { cn } from "@/lib/utils";
import { DashboardSkeleton } from "../_components/ui/admin-skeletons";
import { AdminErrorState } from "../_components/ui/admin-error-state";
import { ADMIN_REFRESH_EVENT } from "./dashboard-shell";

interface DashboardSummary {
  orders_today: number;
  revenue_this_month: number;
  revenue_delta: number;
  avg_ticket: number;
  pending_orders: number;
  active_products: number;
  active_coupons: number;
  sparkline: { day: string; revenue_cents: number }[];
  top_products: { product_id: string; name: string; quantity: number; total_seeds: number }[];
  top_states: { state: string; order_count: number }[];
}

const sparklineConfig = {
  revenue: { label: "Receita", color: "var(--color-primary)" },
} satisfies ChartConfig;

export function DashboardInsights() {
  const locale = useLocale();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState(false);

  const fetchSummary = useCallback(() => {
    fetch("/api/admin/reports/dashboard-summary")
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((summary) => {
        setError(false);
        setData(summary);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    fetchSummary();
    // Pull-to-refresh da casca do dashboard dispara este evento.
    const onRefresh = () => fetchSummary();
    window.addEventListener(ADMIN_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(ADMIN_REFRESH_EVENT, onRefresh);
  }, [fetchSummary]);

  if (error) {
    return (
      <AdminErrorState
        message="Não foi possível carregar o resumo."
        onRetry={fetchSummary}
      />
    );
  }

  if (!data) return <DashboardSkeleton />;

  return (
    <>
      {/* Compact stat cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <MiniCard
          label="Pedidos Hoje"
          count={data.orders_today}
          href={`/${locale}/admin/pedidos`}
        />
        <MiniCard
          label="Receita Mês"
          value={formatPrice(data.revenue_this_month, "pt")}
          delta={data.revenue_delta}
          mono
        />
        <MiniCard
          label="Ticket Médio"
          value={formatPrice(data.avg_ticket, "pt")}
          mono
        />
        <MiniCard
          label="Pendentes"
          count={data.pending_orders}
          warn={data.pending_orders > 0}
          href={`/${locale}/admin/pedidos?status=pending`}
        />
        <MiniCard label="Produtos Ativos" count={data.active_products} />
        <MiniCard label="Cupons Ativos" count={data.active_coupons} />
      </div>

      {/* Insights row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sparkline: last 7 days */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Receita — Últimos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.sparkline.every((s) => s.revenue_cents === 0) ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Nenhuma receita nos últimos 7 dias.
              </p>
            ) : (
              <ChartContainer
                config={sparklineConfig}
                className="h-[160px] w-full md:h-[120px]"
              >
                <BarChart data={data.sparkline}>
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => {
                      const d = new Date(v + "T12:00:00");
                      return d.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3);
                    }}
                    fontSize={10}
                  />
                  <YAxis hide />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatPrice(value as number, "pt")}
                      />
                    }
                  />
                  <Bar
                    dataKey="revenue_cents"
                    fill="var(--color-primary)"
                    radius={[3, 3, 0, 0]}
                    name="revenue"
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Top 3 Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Trophy className="size-3.5" />
              Top Produtos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.top_products.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Nenhuma venda ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {data.top_products.map((p, i) => (
                  <Link
                    key={p.product_id}
                    href={`/${locale}/admin/produtos/${p.product_id}`}
                    className="flex min-h-10 items-center gap-3 rounded-md transition-colors hover:bg-secondary/60"
                  >
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold font-mono text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono text-muted-foreground">
                        {p.quantity} packs
                      </span>
                      {p.total_seeds > 0 && (
                        <span className="block text-[10px] font-mono text-muted-foreground/70">
                          {p.total_seeds} sem.
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 3 States */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              Top Estados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.top_states.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Nenhum dado de região.
              </p>
            ) : (
              <div className="space-y-3">
                {data.top_states.map((s, i) => (
                  <div key={s.state} className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold font-mono text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{s.state}</p>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                      {s.order_count} ped.
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/* ── Mini Stat Card ── */

function MiniCard({
  label,
  value,
  count,
  delta,
  mono,
  warn,
  href,
}: {
  label: string;
  /** Valor já formatado (moeda) — exibido estático. */
  value?: string;
  /** Valor numérico — anima com NumberTicker. */
  count?: number;
  delta?: number;
  mono?: boolean;
  warn?: boolean;
  href?: string;
}) {
  const body = (
    <Card
      className={cn(
        "h-full overflow-hidden",
        href && "transition-colors hover:border-primary/40 hover:bg-secondary/40"
      )}
    >
      <CardContent className="p-4">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
          {label}
        </p>
        <div className="flex items-end gap-2">
          <p
            className={cn(
              "min-w-0 truncate text-base sm:text-lg lg:text-xl font-bold leading-none tabular-nums",
              mono && "font-mono",
              warn && "text-amber-600 dark:text-amber-500"
            )}
            title={value ?? String(count ?? "")}
          >
            {count !== undefined ? (
              <NumberTicker
                value={count}
                className={cn(
                  "text-inherit tracking-normal",
                  warn && "text-amber-600 dark:text-amber-500"
                )}
              />
            ) : (
              value
            )}
          </p>
          {delta !== undefined && (
            <span
              className={`flex items-center text-[11px] font-medium leading-none ${
                delta > 0
                  ? "text-green-600"
                  : delta < 0
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {delta > 0 ? (
                <TrendingUp className="size-3 mr-0.5" />
              ) : delta < 0 ? (
                <TrendingDown className="size-3 mr-0.5" />
              ) : (
                <Minus className="size-3 mr-0.5" />
              )}
              {delta > 0 ? "+" : ""}
              {delta}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <motion.div whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }}>
        <Link href={href} className="block h-full" aria-label={label}>
          {body}
        </Link>
      </motion.div>
    );
  }
  return body;
}
