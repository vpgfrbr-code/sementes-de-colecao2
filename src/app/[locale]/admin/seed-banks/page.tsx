"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  Edit,
  Globe,
  Loader2,
  Plus,
  Store,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { runMutation } from "@/lib/admin-mutation";
import { AdminEmptyState } from "../_components/ui/admin-empty-state";
import { AdminErrorState } from "../_components/ui/admin-error-state";
import { ListPageSkeleton } from "../_components/ui/admin-skeletons";
import { PullToRefresh } from "../_components/ui/pull-to-refresh";
import { ResponsiveOverlay } from "../_components/ui/responsive-overlay";

interface Translation {
  locale: string;
  name: string;
  description: string;
}

interface SeedBank {
  id: string;
  slug: string;
  logo_url: string;
  website: string;
  seed_bank_translations: Translation[];
}

export default function AdminSeedBanksPage() {
  const locale = useLocale();
  const [seedBanks, setSeedBanks] = useState<SeedBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SeedBank | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSeedBanks();
  }, []);

  async function fetchSeedBanks(opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/admin/seed-banks");
      if (!res.ok) throw new Error("fetch failed");
      setSeedBanks(await res.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await runMutation({
      url: `/api/admin/seed-banks/${deleteTarget.id}`,
      method: "DELETE",
      successMessage: "Seed bank excluído",
      errorMessage: "Falha ao excluir o seed bank.",
      onSuccess: () =>
        setSeedBanks((prev) => prev.filter((sb) => sb.id !== deleteTarget.id)),
    });
    setDeleting(false);
    setDeleteTarget(null);
  }

  if (loading) {
    return <ListPageSkeleton variant="table" count={5} />;
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Seed Banks</h1>
        <AdminErrorState
          message="Não foi possível carregar os seed banks."
          onRetry={() => fetchSeedBanks()}
        />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={() => fetchSeedBanks({ silent: true })}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Seed Banks</h1>
            <p className="text-muted-foreground text-sm">
              {seedBanks.length} seed bank{seedBanks.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button asChild className="h-11 shrink-0 md:h-10">
            <Link href={`/${locale}/admin/seed-banks/novo`}>
              <Plus className="mr-2 size-4" />
              <span className="hidden sm:inline">Novo Seed Bank</span>
              <span className="sm:hidden">Novo</span>
            </Link>
          </Button>
        </div>

        {seedBanks.length === 0 ? (
          <AdminEmptyState
            icon={Store}
            title="Nenhum seed bank cadastrado."
            description="Crie o primeiro seed bank para vincular aos produtos."
            action={
              <Button asChild variant="outline" className="h-11">
                <Link href={`/${locale}/admin/seed-banks/novo`}>
                  <Plus className="mr-2 size-4" />
                  Novo Seed Bank
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {seedBanks.map((sb) => {
              const ptName =
                sb.seed_bank_translations.find((t) => t.locale === "pt")?.name ??
                sb.slug;
              return (
                <Card key={sb.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-4 sm:p-5">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Link
                        href={`/${locale}/admin/seed-banks/${sb.id}`}
                        className="flex min-w-0 items-center gap-4"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                          {sb.logo_url ? (
                            <img
                              src={sb.logo_url}
                              alt={ptName}
                              className="size-8 rounded object-contain"
                            />
                          ) : (
                            <Store className="size-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{ptName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {sb.slug}
                          </p>
                        </div>
                      </Link>
                      {sb.website && (
                        <a
                          href={sb.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Globe className="size-3" />
                          site
                        </a>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge variant="outline" className="hidden sm:inline-flex">
                        {sb.seed_bank_translations.length} trad.
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-11 p-0 md:size-9"
                        asChild
                      >
                        <Link
                          href={`/${locale}/admin/seed-banks/${sb.id}`}
                          aria-label={`Editar ${ptName}`}
                        >
                          <Edit className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-11 p-0 md:size-9"
                        onClick={() => setDeleteTarget(sb)}
                        aria-label={`Excluir ${ptName}`}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
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
          title="Excluir seed bank"
          description={
            deleteTarget
              ? `"${
                  deleteTarget.seed_bank_translations.find(
                    (t) => t.locale === "pt"
                  )?.name ?? deleteTarget.slug
                }" será excluído permanentemente.`
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
