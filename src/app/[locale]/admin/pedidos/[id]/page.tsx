"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  Ban,
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  PackageCheck,
  StickyNote,
  Truck,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PaymentProofViewer } from "@/components/payment-proof-viewer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { runMutation } from "@/lib/admin-mutation";
import { formatPrice } from "@/lib/format-price";
import { formatOrderDateForAdmin } from "@/lib/format-date";
import { useAdminSaveRegistration } from "../../_components/admin-save-context";
import { DetailSkeleton } from "../../_components/ui/admin-skeletons";
import { AdminErrorState } from "../../_components/ui/admin-error-state";
import { ResponsiveOverlay } from "../../_components/ui/responsive-overlay";
import { StatusStepper } from "../../_components/ui/status-stepper";
import { StickyActionBar } from "../../_components/ui/sticky-action-bar";
import { OrderTicket } from "@/components/order-ticket";

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
  exchange_rate_used: number | null;
  total_brl_cents: number | null;
  payment_proof_path: string | null;
  tracking_code: string | null;
  shipping_carrier: string | null;
  internal_notes: string | null;
  manual_reseller_user_id: string | null;
  manual_commission_percent: number | null;
  manual_reseller_assigned_at: string | null;
  address: Record<string, string>;
  created_at: string;
}

interface ResellerOption {
  user_id: string;
  display_name: string;
  email: string;
  status: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price_cents: number;
  products: {
    slug: string;
    images: string[];
    product_translations: { name: string; locale: string }[];
  } | null;
  product_variants: { seed_count: number } | null;
}

/** Fluxo feliz do pedido — "cancelled" fica fora da timeline. */
const STATUS_STEPS = [
  { value: "waiting_payment", label: "Aguardando" },
  { value: "payment_reported", label: "Reportado" },
  { value: "approved", label: "Aprovado" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregue" },
];

const STATUS_OPTIONS = [
  ...STATUS_STEPS.map((s) => ({
    value: s.value,
    label:
      s.value === "waiting_payment"
        ? "Aguardando Pagamento"
        : s.value === "payment_reported"
          ? "Pagamento Reportado"
          : s.label,
  })),
  { value: "cancelled", label: "Cancelado" },
];

const CARRIER_OPTIONS = [
  { value: "correios", label: "Correios" },
  { value: "jadlog", label: "Jadlog" },
  { value: "transportadora", label: "Transportadora" },
  { value: "outro", label: "Outro" },
];

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const locale = useLocale();
  const { user } = useUser();
  const isSuperAdmin =
    (user?.publicMetadata as { role?: string } | undefined)?.role ===
    "superadmin";
  const [order, setOrder] = useState<Order | null>(null);
  const [clerkEmail, setClerkEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [trackingCode, setTrackingCode] = useState("");
  const [shippingCarrier, setShippingCarrier] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [resellerOptions, setResellerOptions] = useState<ResellerOption[]>([]);
  const [resellerUserId, setResellerUserId] = useState<string>("");
  const [commissionPercent, setCommissionPercent] = useState<string>("25");
  const [resellerSaving, setResellerSaving] = useState(false);
  // Overlays do fluxo de ação primária
  const [approveOpen, setApproveOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [actionRunning, setActionRunning] = useState(false);

  const hasUnsavedStatus = order ? newStatus !== order.status : false;
  const hasUnsavedTracking = order
    ? trackingCode !== (order.tracking_code ?? "") ||
      shippingCarrier !== (order.shipping_carrier ?? "")
    : false;
  const hasUnsavedNotes = order
    ? internalNotes !== (order.internal_notes ?? "")
    : false;
  const hasDirtyChanges = hasUnsavedStatus || hasUnsavedTracking || hasUnsavedNotes;

  useAdminSaveRegistration({
    label: "Salvar",
    canSave: hasDirtyChanges,
    saving,
    dirty: hasDirtyChanges,
    onSave: updateStatus,
  });

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      if (!res.ok) throw new Error("fetch failed");
      const data: { order: Order; items: OrderItem[] } = await res.json();
      setOrder(data.order);
      setItems(data.items);
      setNewStatus(data.order.status);
      setTrackingCode(data.order.tracking_code ?? "");
      setShippingCarrier(data.order.shipping_carrier ?? "");
      setInternalNotes(data.order.internal_notes ?? "");
      setResellerUserId(data.order.manual_reseller_user_id ?? "");
      setCommissionPercent(
        data.order.manual_commission_percent != null
          ? String(data.order.manual_commission_percent)
          : "25"
      );
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch("/api/admin/resellers?status=active")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ResellerOption[]) => setResellerOptions(data ?? []))
      .catch(() => {});
  }, [isSuperAdmin]);

  useEffect(() => {
    if (order?.guest_email || !order?.clerk_user_id) {
      setClerkEmail(null);
      return;
    }
    fetch(`/api/admin/users/${order.clerk_user_id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((u: { email: string | null } | null) => setClerkEmail(u?.email ?? null))
      .catch(() => {});
  }, [order?.guest_email, order?.clerk_user_id]);

  useEffect(() => {
    if (order?.coupon_id) {
      fetch("/api/admin/coupons")
        .then((res) => (res.ok ? res.json() : []))
        .then((coupons: { id: string; code: string }[]) => {
          const found = coupons.find((c) => c.id === order.coupon_id);
          if (found) setCouponCode(found.code);
        })
        .catch(() => {});
    }
  }, [order?.coupon_id]);

  async function updateStatus() {
    if (!order || !hasDirtyChanges) return;
    setSaving(true);
    const payload: Record<string, string> = {};
    if (newStatus !== order.status) payload.status = newStatus;
    if (trackingCode !== (order.tracking_code ?? "")) payload.tracking_code = trackingCode;
    if (shippingCarrier !== (order.shipping_carrier ?? "")) payload.shipping_carrier = shippingCarrier;
    if (internalNotes !== (order.internal_notes ?? "")) payload.internal_notes = internalNotes;

    await runMutation({
      url: `/api/admin/orders/${order.id}`,
      method: "PATCH",
      body: payload,
      successMessage: "Pedido atualizado",
      errorMessage: "Falha ao salvar o pedido.",
      onSuccess: () =>
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                tracking_code: trackingCode || null,
                shipping_carrier: shippingCarrier || null,
                internal_notes: internalNotes || null,
              }
            : prev
        ),
    });
    setSaving(false);
  }

  /** Transição direta de status via ação primária (aprovar/enviar/entregar). */
  async function transitionStatus(
    status: string,
    extra: Record<string, string> = {},
    successMessage?: string
  ) {
    if (!order) return;
    setActionRunning(true);
    const { ok } = await runMutation({
      url: `/api/admin/orders/${order.id}`,
      method: "PATCH",
      body: { status, ...extra },
      successMessage: successMessage ?? "Status atualizado",
      errorMessage: "Falha ao atualizar o status.",
      onSuccess: () =>
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                status,
                tracking_code: extra.tracking_code ?? prev.tracking_code,
                shipping_carrier: extra.shipping_carrier ?? prev.shipping_carrier,
              }
            : prev
        ),
    });
    if (ok) {
      setNewStatus(status);
      setApproveOpen(false);
      setShipOpen(false);
      setCancelOpen(false);
    }
    setActionRunning(false);
  }

  async function saveResellerAttribution() {
    if (!order) return;
    const pct = Number(commissionPercent);
    if (!resellerUserId || !Number.isFinite(pct) || pct < 0 || pct > 100) {
      return;
    }
    setResellerSaving(true);
    await runMutation({
      url: `/api/admin/orders/${order.id}/reseller`,
      method: "PATCH",
      body: { reseller_user_id: resellerUserId, commission_percent: pct },
      successMessage: "Atribuição salva",
      errorMessage: "Falha ao salvar a atribuição.",
      onSuccess: () =>
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                manual_reseller_user_id: resellerUserId,
                manual_commission_percent: pct,
                manual_reseller_assigned_at: new Date().toISOString(),
              }
            : prev
        ),
    });
    setResellerSaving(false);
  }

  async function clearResellerAttribution() {
    if (!order) return;
    setResellerSaving(true);
    await runMutation({
      url: `/api/admin/orders/${order.id}/reseller`,
      method: "PATCH",
      body: { reseller_user_id: null },
      successMessage: "Atribuição removida",
      errorMessage: "Falha ao remover a atribuição.",
      onSuccess: () => {
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                manual_reseller_user_id: null,
                manual_commission_percent: null,
                manual_reseller_assigned_at: null,
              }
            : prev
        );
        setResellerUserId("");
        setCommissionPercent("25");
      },
    });
    setResellerSaving(false);
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (loadError || !order) {
    return (
      <div className="space-y-4">
        <Link href={`/${locale}/admin/pedidos`}>
          <Button variant="outline" className="h-11">
            <ArrowLeft className="mr-2 size-4" />
            Voltar
          </Button>
        </Link>
        {loadError ? (
          <AdminErrorState
            message="Não foi possível carregar o pedido."
            onRetry={fetchOrder}
          />
        ) : (
          <p className="text-muted-foreground">Pedido não encontrado.</p>
        )}
      </div>
    );
  }

  const addr = order.address;
  const isApprovable =
    order.status === "waiting_payment" || order.status === "payment_reported";

  // Ação primária contextual da StickyActionBar. Quando há alterações não
  // salvas, a save bar global assume o slot — a action bar deve sumir.
  const primaryAction = (() => {
    if (hasDirtyChanges) return null;
    if (isApprovable) {
      return (
        <Button
          className="h-12 flex-1 gap-2 text-sm"
          onClick={() => setApproveOpen(true)}
        >
          <Check className="size-4" aria-hidden />
          Aprovar pagamento
        </Button>
      );
    }
    if (order.status === "approved") {
      return (
        <Button
          className="h-12 flex-1 gap-2 text-sm"
          onClick={() => setShipOpen(true)}
        >
          <Truck className="size-4" aria-hidden />
          Marcar como enviado
        </Button>
      );
    }
    if (order.status === "shipped") {
      return (
        <Button
          className="h-12 flex-1 gap-2 text-sm"
          disabled={actionRunning}
          onClick={() => transitionStatus("delivered", {}, "Pedido marcado como entregue")}
        >
          {actionRunning ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <PackageCheck className="size-4" aria-hidden />
          )}
          Marcar como entregue
        </Button>
      );
    }
    return null;
  })();

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="size-11 p-0 md:size-9">
          <Link href={`/${locale}/admin/pedidos`} aria-label="Voltar para pedidos">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">
            Pedido #{order.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatOrderDateForAdmin(order.created_at, locale)}
          </p>
        </div>
      </div>

      {/* ── Industrial Order Ticket ── */}
      <OrderTicket
        orderId={order.id}
        status={order.status}
        statusLabel={
          STATUS_OPTIONS.find((o) => o.value === order.status)?.label ??
          order.status
        }
        createdAt={order.created_at}
        customerName={order.customer_name}
        email={order.guest_email}
        address={order.address}
        items={items.map((item) => {
          const name =
            item.products?.product_translations?.find((t) => t.locale === "pt")
              ?.name ??
            item.products?.product_translations?.[0]?.name ??
            "Produto removido";
          const rawImage = item.products?.images?.[0] ?? null;
          const slug = item.products?.slug;
          const seedCount = item.product_variants?.seed_count;
          return {
            id: item.id,
            name,
            variantLabel: seedCount ? `${seedCount} sementes` : "",
            quantity: item.quantity,
            unitPriceCents: item.unit_price_cents,
            image: rawImage,
            href: slug ? `/${locale}/produto/${slug}` : undefined,
          };
        })}
        subtotalCents={order.subtotal_cents}
        discountCents={order.discount_cents}
        totalCents={order.total_cents}
        totalBrlCents={order.total_brl_cents}
        exchangeRate={order.exchange_rate_used}
        couponCode={couponCode}
        trackingCode={order.tracking_code}
        shippingCarrier={order.shipping_carrier}
        locale="pt"
        adminView
      />

      {/* Status do pedido — timeline tocável */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Status do Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.status === "cancelled" && newStatus === "cancelled" ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <Ban className="size-4 shrink-0" aria-hidden />
              Pedido cancelado. Selecione um passo abaixo para reativá-lo.
            </div>
          ) : null}
          <StatusStepper
            steps={STATUS_STEPS}
            current={order.status}
            pendingValue={newStatus}
            onSelect={setNewStatus}
            disabled={saving}
          />
          {hasUnsavedStatus && (
            <p className="text-xs text-muted-foreground">
              Status alterado para{" "}
              <span className="font-medium text-foreground">
                {STATUS_OPTIONS.find((o) => o.value === newStatus)?.label}
              </span>
              {" — "}use Salvar para confirmar.
            </p>
          )}
          {order.status !== "cancelled" && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setCancelOpen(true)}
            >
              <Ban className="size-3.5" aria-hidden />
              Cancelar pedido
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Shipping / Tracking */}
        {(newStatus === "shipped" || newStatus === "delivered" || order.tracking_code) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="size-4" />
                Envio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tracking-code" className="text-sm">
                  Código de Rastreio
                </Label>
                <Input
                  id="tracking-code"
                  placeholder="Ex: BR123456789BR"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  className="h-11 font-mono md:h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping-carrier" className="text-sm">
                  Transportadora
                </Label>
                <Select value={shippingCarrier} onValueChange={setShippingCarrier}>
                  <SelectTrigger id="shipping-carrier" className="h-11 md:h-10">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {order.customer_name && (
              <p>
                <span className="text-muted-foreground">Nome:</span>{" "}
                {order.customer_name}
              </p>
            )}
            {(order.guest_email || clerkEmail) && (
              <p>
                <span className="text-muted-foreground">Email:</span>{" "}
                {order.guest_email ?? clerkEmail}
              </p>
            )}
            {order.clerk_user_id && (
              <p>
                <span className="text-muted-foreground">Clerk ID:</span>{" "}
                <code className="text-xs">{order.clerk_user_id}</code>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Endereço</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              {addr?.street}, {addr?.number}
              {addr?.complement ? ` — ${addr.complement}` : ""}
            </p>
            <p>{addr?.neighborhood}</p>
            <p>
              {addr?.city}, {addr?.state} — {addr?.zip}
            </p>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Valores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">
                {formatPrice(order.subtotal_cents, "pt")}
              </span>
            </div>
            {order.discount_cents > 0 && (
              <div className="flex justify-between text-primary">
                <span>Desconto</span>
                <span className="font-mono">
                  -{formatPrice(order.discount_cents, "pt")}
                </span>
              </div>
            )}
            <Separator />
            {order.total_brl_cents != null ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">
                    Total <span className="text-xs font-normal text-muted-foreground">(PIX)</span>
                  </span>
                  <span className="font-mono text-xl font-bold tracking-tight">
                    {formatPrice(order.total_brl_cents, "pt", "BRL")}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {formatPrice(order.total_cents, "pt")}
                    {order.exchange_rate_used ? ` · 1 USD = ${Number(order.exchange_rate_used).toFixed(2)} BRL` : ""}
                  </span>
                  <span className="font-mono uppercase tracking-wider">USD</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="font-mono">
                  {formatPrice(order.total_cents, "pt")}
                </span>
              </div>
            )}
            {order.coupon_id && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Cupom aplicado:</span>
                <Link
                  href={`/${locale}/admin/cupons/${order.coupon_id}`}
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  {couponCode ?? order.coupon_id.slice(0, 8)}
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Proof */}
      {order.payment_proof_path && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comprovante de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentProofViewer
              orderId={order.id}
              proofPath={order.payment_proof_path}
              endpoint="admin"
              autoLoad
              inlinePreview
              triggerLabel="Ampliar comprovante"
            />
          </CardContent>
        </Card>
      )}

      {/* Internal Notes (admin-only) — colapsada para a tela respirar no mobile */}
      <Collapsible defaultOpen={Boolean(order.internal_notes)}>
        <Card className="gap-0 py-0">
          <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 p-4 text-left min-h-12">
            <span className="flex items-center gap-2 text-base font-semibold">
              <StickyNote className="size-4" aria-hidden />
              Notas internas
              {order.internal_notes && (
                <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              )}
            </span>
            <ChevronDown
              className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
              aria-hidden
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-2 px-4 pb-4 pt-0">
              <Textarea
                placeholder="Ex.: cliente VIP, pedido urgente, observação do atendimento..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={4}
                className="resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Visível apenas para administradores. Salva junto com o status ao clicar em Salvar.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Superadmin-only: manual reseller attribution */}
      {isSuperAdmin && (
        <Collapsible defaultOpen={Boolean(order.manual_reseller_user_id)}>
          <Card className="gap-0 py-0">
            <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 p-4 text-left min-h-12">
              <span className="flex items-center gap-2 text-base font-semibold">
                <UserCheck className="size-4" aria-hidden />
                Atribuição de revendedor
                {order.manual_reseller_user_id && (
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                )}
              </span>
              <ChevronDown
                className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 px-4 pb-4 pt-0">
                <p className="text-xs text-muted-foreground">
                  Não altera o total do pedido; afeta apenas o relatório de
                  comissões. A porcentagem é congelada no pedido — alterações
                  futuras não afetam pedidos já atribuídos.
                </p>

                {order.manual_reseller_user_id && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                    <div className="font-medium">Atribuído atualmente</div>
                    <div className="text-muted-foreground">
                      {resellerOptions.find(
                        (r) => r.user_id === order.manual_reseller_user_id
                      )?.display_name ?? order.manual_reseller_user_id}
                      {" — "}
                      {Number(order.manual_commission_percent ?? 0).toFixed(2)}%
                    </div>
                    {order.manual_reseller_assigned_at && (
                      <div className="text-xs text-muted-foreground">
                        Desde{" "}
                        {formatOrderDateForAdmin(
                          order.manual_reseller_assigned_at,
                          locale,
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                  <div className="space-y-2">
                    <Label htmlFor="reseller-select" className="text-sm">
                      Revendedor
                    </Label>
                    <Select
                      value={resellerUserId}
                      onValueChange={setResellerUserId}
                    >
                      <SelectTrigger id="reseller-select" className="h-11 md:h-10">
                        <SelectValue placeholder="Selecionar revendedor ativo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {resellerOptions.length === 0 ? (
                          <SelectItem value="__none" disabled>
                            Nenhum revendedor ativo
                          </SelectItem>
                        ) : (
                          resellerOptions.map((r) => (
                            <SelectItem key={r.user_id} value={r.user_id}>
                              {r.display_name}
                              {r.email ? ` — ${r.email}` : ""}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commission-percent" className="text-sm">
                      Comissão (%)
                    </Label>
                    <Input
                      id="commission-percent"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step={0.01}
                      value={commissionPercent}
                      onChange={(e) => setCommissionPercent(e.target.value)}
                      className="h-11 font-mono md:h-10"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    className="h-11 md:h-9"
                    onClick={saveResellerAttribution}
                    disabled={resellerSaving || !resellerUserId}
                  >
                    {resellerSaving && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Salvar atribuição
                  </Button>
                  {order.manual_reseller_user_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-11 md:h-9"
                      onClick={clearResellerAttribution}
                      disabled={resellerSaving}
                    >
                      Remover atribuição
                    </Button>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Ação primária contextual (mobile). Some quando há dirty state — a
          save bar global ocupa o mesmo slot. */}
      <StickyActionBar show={primaryAction !== null}>{primaryAction}</StickyActionBar>

      {/* Confirmação de aprovação — dispara e-mail ao cliente (irreversível) */}
      <ResponsiveOverlay
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Aprovar pagamento"
        description="Confira o comprovante antes de confirmar."
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-11 sm:h-10"
              onClick={() => setApproveOpen(false)}
              disabled={actionRunning}
            >
              Cancelar
            </Button>
            <Button
              className="h-11 gap-2 sm:h-10"
              disabled={actionRunning}
              onClick={() =>
                transitionStatus(
                  "approved",
                  {},
                  `Pedido #${order.id.slice(0, 8)} aprovado`
                )
              }
            >
              {actionRunning ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Confirmar aprovação
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono font-medium">#{order.id.slice(0, 8)}</span>
              <span className="font-mono text-base font-bold tabular-nums">
                {order.total_brl_cents != null
                  ? formatPrice(order.total_brl_cents, "pt", "BRL")
                  : formatPrice(order.total_cents, "pt")}
              </span>
            </div>
            <p className="mt-1 truncate text-muted-foreground">
              {order.customer_name || order.guest_email || "—"}
            </p>
          </div>
          {order.payment_proof_path ? (
            <PaymentProofViewer
              orderId={order.id}
              proofPath={order.payment_proof_path}
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
            Ao confirmar, o cliente recebe o e-mail de confirmação do pedido e
            o cupom (se houver) é consumido.
          </p>
        </div>
      </ResponsiveOverlay>

      {/* Marcar como enviado — rastreio + transportadora num passo só */}
      <ResponsiveOverlay
        open={shipOpen}
        onOpenChange={setShipOpen}
        title="Marcar como enviado"
        description="Informe o rastreio para notificar o cliente."
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-11 sm:h-10"
              onClick={() => setShipOpen(false)}
              disabled={actionRunning}
            >
              Cancelar
            </Button>
            <Button
              className="h-11 gap-2 sm:h-10"
              disabled={actionRunning}
              onClick={() =>
                transitionStatus(
                  "shipped",
                  {
                    tracking_code: trackingCode,
                    shipping_carrier: shippingCarrier,
                  },
                  "Pedido marcado como enviado"
                )
              }
            >
              {actionRunning ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Truck className="size-4" />
              )}
              Salvar e enviar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ship-tracking" className="text-sm">
              Código de Rastreio
            </Label>
            <Input
              id="ship-tracking"
              placeholder="Ex: BR123456789BR"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              className="h-11 font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ship-carrier" className="text-sm">
              Transportadora
            </Label>
            <Select value={shippingCarrier} onValueChange={setShippingCarrier}>
              <SelectTrigger id="ship-carrier" className="h-11">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                {CARRIER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Com código de rastreio preenchido, o cliente recebe o e-mail de
            envio com o link de acompanhamento.
          </p>
        </div>
      </ResponsiveOverlay>

      {/* Confirmação de cancelamento — devolve estoque e libera cupom */}
      <ResponsiveOverlay
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar pedido"
        description={`Pedido #${order.id.slice(0, 8)} será cancelado.`}
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-11 sm:h-10"
              onClick={() => setCancelOpen(false)}
              disabled={actionRunning}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              className="h-11 gap-2 sm:h-10"
              disabled={actionRunning}
              onClick={() =>
                transitionStatus("cancelled", {}, "Pedido cancelado")
              }
            >
              {actionRunning ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Ban className="size-4" />
              )}
              Cancelar pedido
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          O estoque reservado volta para os produtos e a reserva de uso do
          cupom é liberada. Essa ação pode ser revertida selecionando outro
          status depois.
        </p>
      </ResponsiveOverlay>
    </div>
  );
}
