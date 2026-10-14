"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  CalendarX2,
  Check,
  Copy,
  Edit,
  Eye,
  Link2,
  Loader2,
  Plus,
  Receipt,
  ShoppingCart,
  Tag,
  Trash2,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatPrice } from "@/lib/format-price";
import { haptic } from "@/lib/haptics";
import { runMutation } from "@/lib/admin-mutation";
import { PayCommissionButton } from "../_components/commissions/pay-commission-button";
import { AdminEmptyState } from "../_components/ui/admin-empty-state";
import { AdminErrorState } from "../_components/ui/admin-error-state";
import { ListPageSkeleton } from "../_components/ui/admin-skeletons";
import { PullToRefresh } from "../_components/ui/pull-to-refresh";
import { ResponsiveOverlay } from "../_components/ui/responsive-overlay";

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  min_order_cents: number;
  max_uses: number | null;
  max_uses_per_user: number | null;
  used_count: number;
  approved_usage_count: number;
  total_sales_cents: number;
  total_discount_cents: number;
  reseller_user_id: string | null;
  reseller_name: string | null;
  reseller_email: string | null;
  commission_percent: number | null;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

function formatExpiry(dateStr: string) {
  const d = new Date(dateStr);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
    timeZoneName: "short",
  });
}

export default function AdminCouponsPage() {
  const locale = useLocale();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      haptic("tick");
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  useEffect(() => {
    fetchCoupons();
  }, []);

  async function fetchCoupons(opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/admin/coupons");
      if (!res.ok) throw new Error("fetch failed");
      setCoupons(await res.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(coupon: Coupon) {
    const next = !coupon.active;
    await runMutation({
      url: `/api/admin/coupons/${coupon.id}`,
      method: "PUT",
      body: { active: next },
      successMessage: next ? "Cupom ativado" : "Cupom desativado",
      errorMessage: "Falha ao atualizar o cupom.",
      optimistic: () =>
        setCoupons((prev) =>
          prev.map((c) => (c.id === coupon.id ? { ...c, active: next } : c))
        ),
      rollback: () =>
        setCoupons((prev) =>
          prev.map((c) =>
            c.id === coupon.id ? { ...c, active: coupon.active } : c
          )
        ),
    });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await runMutation({
      url: `/api/admin/coupons/${deleteTarget.id}`,
      method: "DELETE",
      successMessage: "Cupom excluído",
      errorMessage: "Falha ao excluir o cupom.",
      onSuccess: () =>
        setCoupons((prev) => prev.filter((c) => c.id !== deleteTarget.id)),
    });
    setDeleting(false);
    setDeleteTarget(null);
  }

  if (loading) {
    return <ListPageSkeleton variant="grid" count={6} />;
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Cupons</h1>
        <AdminErrorState
          message="Não foi possível carregar os cupons."
          onRetry={() => fetchCoupons()}
        />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={() => fetchCoupons({ silent: true })}>
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cupons</h1>
          <p className="text-muted-foreground text-sm">
            {coupons.length} cupom{coupons.length !== 1 ? "ns" : ""}
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href={`/${locale}/admin/cupons/novo`}>
            <Plus className="mr-2 size-4" />
            Novo Cupom
          </Link>
        </Button>
      </div>

      {coupons.length === 0 ? (
        <AdminEmptyState
          icon={Tag}
          title="Nenhum cupom"
          description="Crie cupons de desconto e acompanhe o desempenho aqui."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {coupons.map((coupon) => (
            <Card key={coupon.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start gap-3 pb-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Tag className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-mono text-base font-bold tracking-wider">
                      {coupon.code}
                    </p>
                    <button
                      type="button"
                      aria-label="Copiar código"
                      onClick={() => copyToClipboard(coupon.code, `code-${coupon.id}`)}
                      className="flex size-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied === `code-${coupon.id}`
                        ? <Check className="size-3.5 text-green-500" />
                        : <Copy className="size-3.5" />}
                    </button>
                    <button
                      type="button"
                      aria-label="Copiar link do cupom"
                      onClick={() => copyToClipboard(
                        `${typeof window !== "undefined" ? window.location.origin : ""}/pt?ref=${coupon.code}`,
                        `link-${coupon.id}`
                      )}
                      className="flex size-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied === `link-${coupon.id}`
                        ? <Check className="size-3.5 text-green-500" />
                        : <Link2 className="size-3.5" />}
                    </button>
                  </div>
                  <Badge variant="secondary" className="mt-1 font-mono text-xs">
                    {coupon.type === "percentage"
                      ? `${coupon.value}% de desconto`
                      : `${formatPrice(coupon.value, "pt")} de desconto`}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-2 pt-0 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Tag className="size-3 shrink-0" />
                  <span>
                    {coupon.approved_usage_count} uso{coupon.approved_usage_count !== 1 ? "s" : ""}
                    {coupon.max_uses ? ` de ${coupon.max_uses}` : ""}
                    {coupon.max_uses_per_user
                      ? ` · máx ${coupon.max_uses_per_user}/conta`
                      : ""}
                  </span>
                </div>

                {coupon.min_order_cents > 0 && (
                  <div className="flex items-center gap-1.5">
                    <ShoppingCart className="size-3 shrink-0" />
                    <span>Pedido mín: {formatPrice(coupon.min_order_cents, "pt")}</span>
                  </div>
                )}

                {coupon.expires_at && (
                  <div className="flex items-center gap-1.5">
                    <CalendarX2 className="size-3 shrink-0" />
                    <span>Expira em {formatExpiry(coupon.expires_at)}</span>
                  </div>
                )}

                {(coupon.reseller_name || coupon.reseller_user_id) && (
                  <div className="flex items-center gap-1.5">
                    <User className="size-3 shrink-0" />
                    <span className="truncate">
                      {coupon.reseller_name ?? coupon.reseller_user_id}
                    </span>
                  </div>
                )}

                {coupon.approved_usage_count > 0 && (
                  <div className="mt-2 flex items-center gap-3 border-t border-dashed pt-2">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="size-3 shrink-0 text-primary" />
                      <span className="font-mono font-medium text-foreground">
                        {formatPrice(coupon.total_sales_cents, "pt")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Receipt className="size-3 shrink-0 text-accent" />
                      <span className="font-mono">
                        -{formatPrice(coupon.total_discount_cents, "pt")}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-2 border-t pt-3">
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={coupon.active ? "default" : "outline"} className="text-xs">
                      {coupon.active ? "Ativo" : "Inativo"}
                    </Badge>
                    {coupon.commission_percent != null && coupon.commission_percent > 0 && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {coupon.commission_percent}% comissão
                      </Badge>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 md:size-8"
                      aria-label={coupon.active ? "Desativar cupom" : "Ativar cupom"}
                      onClick={() => toggleActive(coupon)}
                    >
                      {coupon.active
                        ? <ToggleRight className="size-4" />
                        : <ToggleLeft className="size-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="size-11 md:size-8" aria-label="Visualizar cupom" asChild>
                      <Link href={`/${locale}/admin/cupons/${coupon.id}/ver`}>
                        <Eye className="size-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="size-11 md:size-8" aria-label="Editar cupom" asChild>
                      <Link href={`/${locale}/admin/cupons/${coupon.id}`}>
                        <Edit className="size-4" />
                      </Link>
                    </Button>
                    {coupon.approved_usage_count === 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 md:size-8"
                      aria-label="Excluir cupom"
                      onClick={() => setDeleteTarget(coupon)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                    )}
                  </div>
                </div>
                {coupon.commission_percent != null &&
                  coupon.commission_percent > 0 && (
                    <div className="w-full">
                      <PayCommissionButton
                        resellerName={
                          coupon.reseller_name ??
                          coupon.reseller_user_id ??
                          coupon.code
                        }
                        resellerUserId={null}
                        couponId={coupon.id}
                        couponCode={coupon.code}
                      />
                    </div>
                  )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <ResponsiveOverlay
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir cupom"
        description={
          deleteTarget
            ? `O cupom ${deleteTarget.code} será excluído permanentemente.`
            : undefined
        }
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-11 sm:h-10"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="h-11 gap-2 sm:h-10"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Excluir
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Só é possível excluir cupons sem usos aprovados. Essa ação não pode
          ser desfeita.
        </p>
      </ResponsiveOverlay>
    </div>
    </PullToRefresh>
  );
}
