"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Check, Loader2, Star, Trash2, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { runMutation } from "@/lib/admin-mutation";
import { AdminEmptyState } from "../_components/ui/admin-empty-state";
import { AdminErrorState } from "../_components/ui/admin-error-state";
import { ListPageSkeleton } from "../_components/ui/admin-skeletons";
import { PullToRefresh } from "../_components/ui/pull-to-refresh";
import { ResponsiveOverlay } from "../_components/ui/responsive-overlay";

interface ReviewRow {
  id: string;
  product_id: string;
  order_id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  rejected_reason: string | null;
  created_at: string;
  products: {
    slug: string;
    product_translations: { locale: string; name: string }[];
  };
}

export default function AdminReviewsPage() {
  const locale = useLocale();
  const [status, setStatus] = useState<"pending" | "approved" | "all">("pending");
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReviewRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load(filter: typeof status, opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`/api/admin/reviews?status=${filter}`);
      if (!res.ok) throw new Error("fetch failed");
      const body = await res.json();
      setReviews(body.reviews ?? []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(status);
  }, [status]);

  async function moderate(id: string, action: "approve" | "reject") {
    setActionId(id);
    await runMutation({
      url: `/api/admin/reviews/${id}`,
      method: "POST",
      body: { action },
      successMessage:
        action === "approve" ? "Avaliação aprovada" : "Avaliação rejeitada",
      errorMessage:
        action === "approve"
          ? "Falha ao aprovar a avaliação."
          : "Falha ao rejeitar a avaliação.",
      onSuccess: () => setReviews((prev) => prev.filter((r) => r.id !== id)),
    });
    setActionId(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await runMutation({
      url: `/api/admin/reviews/${deleteTarget.id}`,
      method: "DELETE",
      successMessage: "Avaliação excluída",
      errorMessage: "Falha ao excluir a avaliação.",
      onSuccess: () =>
        setReviews((prev) => prev.filter((r) => r.id !== deleteTarget.id)),
    });
    setDeleting(false);
    setDeleteTarget(null);
  }

  if (loading) {
    return <ListPageSkeleton variant="table" count={4} />;
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Avaliações</h1>
          <p className="text-sm text-muted-foreground">
            Moderação de reviews enviadas pelos clientes.
          </p>
        </header>
        <AdminErrorState
          message="Não foi possível carregar as avaliações."
          onRetry={() => load(status)}
        />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={() => load(status, { silent: true })}>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Avaliações</h1>
          <p className="text-sm text-muted-foreground">
            Moderação de reviews enviadas pelos clientes.
          </p>
        </header>

        <Tabs
          value={status}
          onValueChange={(v) => setStatus(v as typeof status)}
        >
          <TabsList>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="approved">Publicadas</TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>
        </Tabs>

        {reviews.length === 0 ? (
          <AdminEmptyState
            icon={Star}
            title="Nenhuma avaliação encontrada."
            description="As avaliações enviadas pelos clientes aparecem aqui."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map((r) => {
              const productName =
                r.products?.product_translations?.find((t) => t.locale === "pt")
                  ?.name ??
                r.products?.product_translations?.[0]?.name ??
                r.product_id;
              const prefix = locale === "pt" ? "" : `/${locale}`;
              return (
                <Card key={r.id}>
                  <CardContent className="flex flex-col gap-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">
                            {r.author_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <Link
                          href={`${prefix}/produto/${r.products?.slug ?? ""}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          {productName}
                          <ExternalLink className="size-3" />
                        </Link>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={cn(
                              "h-4 w-4",
                              r.rating >= n
                                ? "fill-amber-500 text-amber-500"
                                : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    {r.title && <p className="font-bold">{r.title}</p>}
                    {r.body && (
                      <p className="whitespace-pre-wrap text-sm text-foreground/80">
                        {r.body}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {!r.approved && !r.rejected_reason && (
                        <>
                          <Button
                            size="sm"
                            className="h-11 md:h-9"
                            onClick={() => moderate(r.id, "approve")}
                            disabled={actionId === r.id}
                            aria-label={`Aprovar avaliação de ${r.author_name}`}
                          >
                            <Check className="mr-1.5 size-4" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-11 md:h-9"
                            onClick={() => moderate(r.id, "reject")}
                            disabled={actionId === r.id}
                            aria-label={`Rejeitar avaliação de ${r.author_name}`}
                          >
                            <X className="mr-1.5 size-4" />
                            Rejeitar
                          </Button>
                        </>
                      )}
                      {r.approved && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-11 md:h-9"
                          onClick={() => moderate(r.id, "reject")}
                          disabled={actionId === r.id}
                          aria-label={`Despublicar avaliação de ${r.author_name}`}
                        >
                          Despublicar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-11 text-destructive hover:text-destructive md:h-9"
                        onClick={() => setDeleteTarget(r)}
                        disabled={actionId === r.id}
                        aria-label={`Excluir avaliação de ${r.author_name}`}
                      >
                        <Trash2 className="mr-1.5 size-4" />
                        Excluir
                      </Button>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Pedido #{r.order_id.slice(0, 8)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <ResponsiveOverlay
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Excluir avaliação"
          description={
            deleteTarget
              ? `A avaliação de ${deleteTarget.author_name} será excluída permanentemente.`
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
            Esta ação não pode ser desfeita.
          </p>
        </ResponsiveOverlay>
      </div>
    </PullToRefresh>
  );
}
