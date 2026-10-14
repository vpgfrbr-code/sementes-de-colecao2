"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  CalendarClock,
  Edit,
  Loader2,
  Plus,
  Tag,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Zap,
  FolderTree,
  Boxes,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { runMutation } from "@/lib/admin-mutation";
import { AdminEmptyState } from "../_components/ui/admin-empty-state";
import { AdminErrorState } from "../_components/ui/admin-error-state";
import { ListPageSkeleton } from "../_components/ui/admin-skeletons";
import { PullToRefresh } from "../_components/ui/pull-to-refresh";
import { ResponsiveOverlay } from "../_components/ui/responsive-overlay";

interface FlashSaleTranslation {
  locale: string;
  title: string;
  subtitle: string;
  button_text: string;
}

interface FlashSaleItem {
  id: string;
  product_id: string | null;
  category_id: string | null;
  products: { slug: string; product_translations: { locale: string; name: string }[] } | null;
  categories: { slug: string; category_translations: { locale: string; name: string }[] } | null;
}

interface FlashSale {
  id: string;
  active: boolean;
  coupon_id: string | null;
  discount_type: string;
  discount_value: number;
  ends_at: string;
  created_at: string;
  flash_sale_translations: FlashSaleTranslation[];
  flash_sale_items: FlashSaleItem[];
  coupons: { code: string; type: string; value: number } | null;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ptTitleOf(sale: FlashSale) {
  return (
    sale.flash_sale_translations.find((t) => t.locale === "pt")?.title ??
    sale.flash_sale_translations[0]?.title ??
    "Sem título"
  );
}

export default function AdminFlashSalePage() {
  const locale = useLocale();
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FlashSale | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales(opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/admin/flash-sales");
      if (!res.ok) throw new Error("fetch failed");
      setSales(await res.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(sale: FlashSale) {
    await runMutation({
      url: `/api/admin/flash-sales/${sale.id}`,
      method: "PUT",
      body: { active: !sale.active },
      successMessage: sale.active
        ? "Flash sale desativada"
        : "Flash sale ativada",
      errorMessage: "Falha ao atualizar a flash sale.",
      onSuccess: () =>
        setSales((prev) =>
          prev.map((s) => (s.id === sale.id ? { ...s, active: !sale.active } : s))
        ),
    });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await runMutation({
      url: `/api/admin/flash-sales/${deleteTarget.id}`,
      method: "DELETE",
      successMessage: "Flash sale excluída",
      errorMessage: "Falha ao excluir a flash sale.",
      onSuccess: () =>
        setSales((prev) => prev.filter((s) => s.id !== deleteTarget.id)),
    });
    setDeleting(false);
    setDeleteTarget(null);
  }

  if (loading) {
    return <ListPageSkeleton variant="table" count={4} />;
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Zap className="size-6 text-amber-500" />
          Flash Sales
        </h1>
        <AdminErrorState
          message="Não foi possível carregar as flash sales."
          onRetry={() => fetchSales()}
        />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={() => fetchSales({ silent: true })}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Zap className="size-6 text-amber-500" />
              Flash Sales
            </h1>
            <p className="text-muted-foreground text-sm">
              {sales.length} flash sale{sales.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button asChild className="h-11 w-full sm:w-auto md:h-10">
            <Link href={`/${locale}/admin/flash-sale/novo`}>
              <Plus className="mr-2 size-4" />
              Nova Flash Sale
            </Link>
          </Button>
        </div>

        {sales.length === 0 ? (
          <AdminEmptyState
            icon={Zap}
            title="Nenhuma flash sale."
            description="Crie a primeira flash sale para destacar ofertas na loja."
            action={
              <Button asChild variant="outline" className="h-11">
                <Link href={`/${locale}/admin/flash-sale/novo`}>
                  <Plus className="mr-2 size-4" />
                  Nova Flash Sale
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sales.map((sale) => {
              const ptTitle = ptTitleOf(sale);
              const isExpired = new Date(sale.ends_at) < new Date();
              const itemCount = sale.flash_sale_items.length;
              const categoryCount = sale.flash_sale_items.filter((i) => i.category_id).length;
              const productCount = sale.flash_sale_items.filter((i) => i.product_id).length;

              return (
                <Card key={sale.id} className="flex flex-col">
                  <CardHeader className="flex flex-row items-start gap-3 pb-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <Zap className="size-5 text-amber-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-bold">
                        {ptTitle}
                      </p>
                      <Badge variant="secondary" className="mt-1 font-mono text-xs">
                        {sale.discount_type === "percentage"
                          ? `${sale.discount_value}% OFF`
                          : `$${(sale.discount_value / 100).toFixed(2)} OFF`}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-2 pt-0 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CalendarClock className="size-3 shrink-0" />
                      <span>
                        Termina em {formatDate(sale.ends_at)}
                        {isExpired && (
                          <Badge variant="destructive" className="ml-2 text-[10px]">
                            Expirada
                          </Badge>
                        )}
                      </span>
                    </div>

                    {sale.coupons && (
                      <div className="flex items-center gap-1.5">
                        <Tag className="size-3 shrink-0" />
                        <span className="font-mono">{sale.coupons.code}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      {categoryCount > 0 && (
                        <span className="flex items-center gap-1">
                          <FolderTree className="size-3" />
                          {categoryCount} categoria{categoryCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {productCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Boxes className="size-3" />
                          {productCount} produto{productCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {itemCount === 0 && <span>Nenhum item</span>}
                    </div>
                  </CardContent>

                  <CardFooter className="flex items-center justify-between gap-2 border-t pt-3">
                    <Badge variant={sale.active ? "default" : "outline"} className="text-xs">
                      {sale.active ? "Ativa" : "Inativa"}
                    </Badge>
                    <div className="flex shrink-0 items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11 md:size-9"
                        onClick={() => toggleActive(sale)}
                        title={sale.active ? "Desativar" : "Ativar"}
                        aria-label={
                          sale.active
                            ? `Desativar ${ptTitle}`
                            : `Ativar ${ptTitle}`
                        }
                      >
                        {sale.active ? (
                          <ToggleRight className="size-4 text-primary" />
                        ) : (
                          <ToggleLeft className="size-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11 md:size-9"
                        title="Editar"
                        asChild
                      >
                        <Link
                          href={`/${locale}/admin/flash-sale/${sale.id}`}
                          aria-label={`Editar ${ptTitle}`}
                        >
                          <Edit className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11 md:size-9"
                        onClick={() => setDeleteTarget(sale)}
                        title="Excluir"
                        aria-label={`Excluir ${ptTitle}`}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        <ResponsiveOverlay
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Excluir flash sale"
          description={
            deleteTarget
              ? `"${ptTitleOf(deleteTarget)}" será excluída permanentemente.`
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
            Os produtos e categorias vinculados não são excluídos — apenas a
            campanha sai do ar.
          </p>
        </ResponsiveOverlay>
      </div>
    </PullToRefresh>
  );
}
