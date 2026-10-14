"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useUser } from "@clerk/nextjs";
import { motion } from "motion/react";
import {
  Check,
  ChevronDown,
  Eye,
  Loader2,
  MoreHorizontal,
  Package,
  Search,
  Tag,
  X,
} from "lucide-react";
import { PaymentProofViewer } from "@/components/payment-proof-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import { runMutation } from "@/lib/admin-mutation";
import { formatPrice } from "@/lib/format-price";
import { formatOrderDateForAdmin, formatRelativeAge } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { AdminEmptyState } from "../_components/ui/admin-empty-state";
import { AdminErrorState } from "../_components/ui/admin-error-state";
import { ListPageSkeleton } from "../_components/ui/admin-skeletons";
import { FilterChips } from "../_components/ui/filter-chips";
import { PullToRefresh } from "../_components/ui/pull-to-refresh";
import { ResponsiveOverlay } from "../_components/ui/responsive-overlay";
import { SwipeableRow } from "../_components/ui/swipeable-row";

interface Order {
  id: string;
  status: string;
  total_cents: number;
  subtotal_cents: number;
  discount_cents: number;
  customer_name: string | null;
  guest_email: string | null;
  clerk_user_id: string | null;
  coupon_id: string | null;
  coupon_code: string | null;
  payment_proof_path: string | null;
  total_brl_cents: number | null;
  created_at: string;
}

interface CouponOption {
  id: string;
  code: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  waiting_payment: "outline",
  payment_reported: "default",
  approved: "default",
  shipped: "secondary",
  delivered: "secondary",
  cancelled: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  waiting_payment: "Aguardando",
  payment_reported: "Reportado",
  approved: "Aprovado",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

/** Acento lateral dos cards mobile por status. */
const STATUS_ACCENT: Record<string, string> = {
  waiting_payment: "border-l-muted-foreground/30",
  payment_reported: "border-l-primary",
  approved: "border-l-green-600 dark:border-l-green-500",
  shipped: "border-l-blue-600 dark:border-l-blue-500",
  delivered: "border-l-muted-foreground/30",
  cancelled: "border-l-destructive",
};

const PAGE_SIZE = 30;

function isApprovable(order: Order) {
  return order.status === "waiting_payment" || order.status === "payment_reported";
}

function formatTotals(order: Order) {
  if (order.total_brl_cents) {
    return {
      main: (order.total_brl_cents / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      sub: formatPrice(order.total_cents, "pt"),
    };
  }
  return { main: formatPrice(order.total_cents, "pt"), sub: null };
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<ListPageSkeleton variant="orders" />}>
      <AdminOrdersContent />
    </Suspense>
  );
}

function AdminOrdersContent() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const isSuperAdmin =
    (user?.publicMetadata as { role?: string } | undefined)?.role ===
    "superadmin";
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [statusFilter, setStatusFilter] = useState(() => {
    const fromUrl = searchParams.get("status");
    return fromUrl && (STATUS_LABELS[fromUrl] || fromUrl === "pending")
      ? fromUrl
      : "all";
  });
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 250);
  const [couponOptions, setCouponOptions] = useState<CouponOption[]>([]);
  const [updatingCouponId, setUpdatingCouponId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [approveTarget, setApproveTarget] = useState<Order | null>(null);
  const [actionsTarget, setActionsTarget] = useState<Order | null>(null);

  const fetchOrders = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/admin/orders?all=true");
      if (!res.ok) throw new Error("fetch failed");
      setOrders(await res.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch("/api/admin/coupons")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: CouponOption[]) => setCouponOptions(data ?? []))
      .catch(() => setCouponOptions([]));
  }, [isSuperAdmin]);

  // Filtro/busca novos resetam a janela de paginação.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [statusFilter, debouncedQuery]);

  async function approveOrder(order: Order) {
    setApprovingId(order.id);
    const previousStatus = order.status;
    await runMutation({
      url: `/api/admin/orders/${order.id}`,
      method: "PATCH",
      body: { status: "approved" },
      successMessage: `Pedido #${order.id.slice(0, 8)} aprovado`,
      errorMessage: "Falha ao aprovar o pedido.",
      optimistic: () =>
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: "approved" } : o))
        ),
      rollback: () =>
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: previousStatus } : o))
        ),
    });
    setApprovingId(null);
    setApproveTarget(null);
  }

  async function updateOrderCoupon(orderId: string, rawValue: string) {
    // "__none" sentinel means "clear the coupon"
    const couponCode = rawValue === "__none" ? null : rawValue;
    setUpdatingCouponId(orderId);
    await runMutation<{ coupon_id: string | null; coupon_code: string | null }>({
      url: `/api/admin/orders/${orderId}/coupon`,
      method: "PATCH",
      body: { coupon_code: couponCode },
      successMessage: couponCode ? `Cupom ${couponCode} atribuído` : "Cupom removido",
      errorMessage: "Falha ao atualizar o cupom.",
      onSuccess: (data) =>
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, coupon_id: data.coupon_id, coupon_code: data.coupon_code }
              : o
          )
        ),
    });
    setUpdatingCouponId(null);
  }

  const filtered = useMemo(() => {
    // "pending" é o balde acionável: aguardando + reportado (deep-link do
    // dashboard e chip próprio).
    const base =
      statusFilter === "all"
        ? orders
        : statusFilter === "pending"
          ? orders.filter((o) => isApprovable(o))
          : orders.filter((o) => o.status === statusFilter);
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (o) =>
        o.id.toLowerCase().startsWith(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.guest_email?.toLowerCase().includes(q)
    );
  }, [orders, statusFilter, debouncedQuery]);

  const countByStatus = useMemo(
    () =>
      orders.reduce<Record<string, number>>((acc, o) => {
        acc[o.status] = (acc[o.status] ?? 0) + 1;
        return acc;
      }, {}),
    [orders]
  );

  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;

  if (loading) {
    return <ListPageSkeleton variant="orders" />;
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
        <AdminErrorState
          message="Não foi possível carregar os pedidos."
          onRetry={() => fetchOrders()}
        />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={() => fetchOrders({ silent: true })}>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
          <p className="text-muted-foreground text-sm">
            {orders.length} pedido{orders.length !== 1 ? "s" : ""} no total
          </p>
        </div>

        <FilterChips
          aria-label="Filtrar pedidos por status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "Todos", count: orders.length },
            {
              value: "pending",
              label: "Pendentes",
              count:
                (countByStatus["waiting_payment"] ?? 0) +
                (countByStatus["payment_reported"] ?? 0),
            },
            ...Object.entries(STATUS_LABELS).map(([key, label]) => ({
              value: key,
              label,
              count: countByStatus[key] ?? 0,
            })),
          ]}
        />

        <div className="space-y-1.5">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por ID, nome ou email…"
              className="h-11 pl-9 pr-10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Limpar busca"
                className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          {debouncedQuery.trim() && (
            <p className="text-xs text-muted-foreground">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {filtered.length === 0 ? (
          <AdminEmptyState
            icon={Package}
            title="Nenhum pedido encontrado"
            description={
              debouncedQuery.trim() || statusFilter !== "all"
                ? "Ajuste a busca ou o filtro de status."
                : "Os pedidos da loja aparecerão aqui."
            }
          />
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="space-y-3 md:hidden">
              {visible.map((order) => (
                <OrderMobileCard
                  key={order.id}
                  order={order}
                  locale={locale}
                  approving={approvingId === order.id}
                  onApprove={() => setApproveTarget(order)}
                  onMore={isSuperAdmin ? () => setActionsTarget(order) : undefined}
                />
              ))}
            </div>

            {/* Desktop: table */}
            <Card className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cupom</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Comprov.</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((order) => {
                    const totals = formatTotals(order);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm font-medium">
                          <Link
                            href={`/${locale}/admin/pedidos/${order.id}`}
                            className="hover:underline"
                          >
                            #{order.id.slice(0, 8)}
                          </Link>
                        </TableCell>

                        <TableCell>
                          <div className="max-w-[180px]">
                            <p className="truncate text-sm">
                              {order.customer_name || "—"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {order.guest_email ||
                                order.clerk_user_id?.slice(0, 12) ||
                                ""}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatOrderDateForAdmin(order.created_at, locale, {
                            withTime: false,
                          })}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={STATUS_VARIANT[order.status] ?? "outline"}
                            className="whitespace-nowrap"
                          >
                            {STATUS_LABELS[order.status] ?? order.status}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {isSuperAdmin ? (
                            <Select
                              value={order.coupon_code ?? "__none"}
                              onValueChange={(v) => updateOrderCoupon(order.id, v)}
                              disabled={updatingCouponId === order.id}
                            >
                              <SelectTrigger className="h-8 w-[150px] font-mono text-xs">
                                <SelectValue placeholder="Sem cupom" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none">Sem cupom</SelectItem>
                                {couponOptions.map((c) => (
                                  <SelectItem key={c.id} value={c.code}>
                                    {c.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : order.coupon_code ? (
                            <span className="font-mono text-xs">
                              {order.coupon_code}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right whitespace-nowrap">
                          <span className="font-mono text-sm font-bold">
                            {totals.main}
                          </span>
                          {totals.sub && (
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {totals.sub}
                            </p>
                          )}
                          {order.discount_cents > 0 && (
                            <p className="text-[10px] text-primary/80">
                              -{formatPrice(order.discount_cents, "pt")}
                            </p>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {order.payment_proof_path ? (
                            <div className="flex justify-center">
                              <PaymentProofViewer
                                orderId={order.id}
                                proofPath={order.payment_proof_path}
                                endpoint="admin"
                                thumbnail
                                triggerLabel="Visualizar comprovante"
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isApprovable(order) && (
                              <Button
                                size="sm"
                                variant="default"
                                className="h-8 gap-1.5 px-3"
                                disabled={approvingId === order.id}
                                onClick={() => setApproveTarget(order)}
                              >
                                {approvingId === order.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Check className="size-3.5" />
                                )}
                                Aprovar
                              </Button>
                            )}
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <Link
                                href={`/${locale}/admin/pedidos/${order.id}`}
                                aria-label={`Ver pedido ${order.id.slice(0, 8)}`}
                              >
                                <Eye className="size-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>

            {remaining > 0 && (
              <Button
                variant="outline"
                className="h-11 w-full gap-2 md:w-auto"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                <ChevronDown className="size-4" aria-hidden />
                Carregar mais ({remaining} restante{remaining !== 1 ? "s" : ""})
              </Button>
            )}
          </>
        )}

        {/* Drawer/dialog de confirmação de aprovação. A aprovação envia o
            e-mail de confirmação ao cliente — irreversível, sempre confirmar. */}
        <ResponsiveOverlay
          open={approveTarget !== null}
          onOpenChange={(open) => {
            if (!open) setApproveTarget(null);
          }}
          title="Aprovar pagamento"
          description="Confira o comprovante antes de confirmar."
          footer={
            approveTarget ? (
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  className="h-11 sm:h-10"
                  onClick={() => setApproveTarget(null)}
                  disabled={approvingId === approveTarget.id}
                >
                  Cancelar
                </Button>
                <Button
                  className="h-11 gap-2 sm:h-10"
                  onClick={() => approveOrder(approveTarget)}
                  disabled={approvingId === approveTarget.id}
                >
                  {approvingId === approveTarget.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Confirmar aprovação
                </Button>
              </div>
            ) : null
          }
        >
          {approveTarget && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono font-medium">
                    #{approveTarget.id.slice(0, 8)}
                  </span>
                  <span className="font-mono text-base font-bold tabular-nums">
                    {formatTotals(approveTarget).main}
                  </span>
                </div>
                <p className="mt-1 truncate text-muted-foreground">
                  {approveTarget.customer_name || approveTarget.guest_email || "—"}
                </p>
              </div>
              {approveTarget.payment_proof_path ? (
                <PaymentProofViewer
                  orderId={approveTarget.id}
                  proofPath={approveTarget.payment_proof_path}
                  endpoint="admin"
                  autoLoad
                  inlinePreview
                  triggerLabel="Ampliar comprovante"
                />
              ) : (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  Este pedido não tem comprovante anexado.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Ao confirmar, o cliente recebe o e-mail de confirmação do
                pedido e o cupom (se houver) é consumido.
              </p>
            </div>
          )}
        </ResponsiveOverlay>

        {/* Ações extras do card mobile (superadmin): atribuir cupom. */}
        <ResponsiveOverlay
          open={actionsTarget !== null}
          onOpenChange={(open) => {
            if (!open) setActionsTarget(null);
          }}
          title={actionsTarget ? `Pedido #${actionsTarget.id.slice(0, 8)}` : "Pedido"}
          description="Atribuir ou remover cupom do pedido."
        >
          {actionsTarget && (
            <div className="space-y-2 pb-2">
              <button
                type="button"
                disabled={updatingCouponId === actionsTarget.id}
                onClick={async () => {
                  await updateOrderCoupon(actionsTarget.id, "__none");
                  setActionsTarget(null);
                }}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 text-left text-sm transition-colors",
                  !actionsTarget.coupon_code
                    ? "border-primary bg-primary/5 font-medium"
                    : "hover:bg-secondary"
                )}
              >
                <Tag className="size-4 text-muted-foreground" aria-hidden />
                Sem cupom
              </button>
              {couponOptions.map((c) => {
                const active = actionsTarget.coupon_code === c.code;
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={updatingCouponId === actionsTarget.id}
                    onClick={async () => {
                      await updateOrderCoupon(actionsTarget.id, c.code);
                      setActionsTarget(null);
                    }}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 text-left font-mono text-sm transition-colors",
                      active
                        ? "border-primary bg-primary/5 font-medium"
                        : "hover:bg-secondary"
                    )}
                  >
                    <Tag
                      className={cn(
                        "size-4",
                        active ? "text-primary" : "text-muted-foreground"
                      )}
                      aria-hidden
                    />
                    {c.code}
                    {active && <Check className="ml-auto size-4 text-primary" aria-hidden />}
                  </button>
                );
              })}
            </div>
          )}
        </ResponsiveOverlay>
      </div>
    </PullToRefresh>
  );
}

/* ── Card mobile de pedido ── */

function OrderMobileCard({
  order,
  locale,
  approving,
  onApprove,
  onMore,
}: {
  order: Order;
  locale: string;
  approving: boolean;
  onApprove: () => void;
  onMore?: () => void;
}) {
  const totals = formatTotals(order);
  const approvable = isApprovable(order);

  const card = (
    <motion.div whileTap={{ scale: 0.98 }} transition={{ duration: 0.1 }}>
      <Card
        className={cn(
          "overflow-hidden border-l-4",
          STATUS_ACCENT[order.status] ?? "border-l-border"
        )}
      >
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={`/${locale}/admin/pedidos/${order.id}`}
              className="font-mono text-sm font-medium hover:underline"
            >
              #{order.id.slice(0, 8)}
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {formatRelativeAge(order.created_at)}
              </span>
              <Badge
                variant={STATUS_VARIANT[order.status] ?? "outline"}
                className="whitespace-nowrap"
              >
                {STATUS_LABELS[order.status] ?? order.status}
              </Badge>
            </div>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {order.customer_name || "—"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {order.guest_email || order.clerk_user_id?.slice(0, 12) || ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="font-mono text-lg font-bold leading-none tabular-nums">
                {totals.main}
              </span>
              {totals.sub && (
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
                  {totals.sub}
                </p>
              )}
              {order.discount_cents > 0 && (
                <p className="text-[10px] text-primary/80">
                  -{formatPrice(order.discount_cents, "pt")}
                </p>
              )}
            </div>
          </div>

          {(order.coupon_code || order.payment_proof_path) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {order.coupon_code && (
                <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[11px] text-secondary-foreground">
                  {order.coupon_code}
                </span>
              )}
              {order.payment_proof_path && (
                <PaymentProofViewer
                  orderId={order.id}
                  proofPath={order.payment_proof_path}
                  endpoint="admin"
                  thumbnail
                  triggerLabel="Comprovante"
                />
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {approvable && (
              <Button
                size="sm"
                variant="default"
                className="h-11 flex-1 gap-1.5"
                disabled={approving}
                onClick={onApprove}
              >
                {approving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Aprovar
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              size="sm"
              className={cn("h-11 gap-1.5", !approvable && "flex-1")}
            >
              <Link href={`/${locale}/admin/pedidos/${order.id}`}>
                <Eye className="size-4" />
                Detalhes
              </Link>
            </Button>
            {onMore && (
              <Button
                variant="outline"
                size="sm"
                className="h-11 w-11 shrink-0 p-0"
                onClick={onMore}
                aria-label="Mais ações do pedido"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <SwipeableRow
      rightAction={
        approvable
          ? {
              label: "Aprovar",
              icon: Check,
              onTrigger: onApprove,
              className: "bg-green-600 text-white dark:bg-green-700",
            }
          : undefined
      }
      leftAction={{
        label: "Ver",
        icon: Eye,
        onTrigger: () => {
          window.location.href = `/${locale}/admin/pedidos/${order.id}`;
        },
        className: "bg-secondary text-secondary-foreground",
      }}
    >
      {card}
    </SwipeableRow>
  );
}
