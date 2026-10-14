"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  Edit,
  FolderTree,
  Loader2,
  Plus,
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

interface Category {
  id: string;
  slug: string;
  created_at: string;
  category_translations: Translation[];
}

export default function AdminCategoriesPage() {
  const locale = useLocale();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories(opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error("fetch failed");
      setCategories(await res.json());
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
      url: `/api/admin/categories/${deleteTarget.id}`,
      method: "DELETE",
      successMessage: "Categoria excluída",
      errorMessage: "Falha ao excluir a categoria.",
      onSuccess: () =>
        setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id)),
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
        <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
        <AdminErrorState
          message="Não foi possível carregar as categorias."
          onRetry={() => fetchCategories()}
        />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={() => fetchCategories({ silent: true })}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
            <p className="text-muted-foreground text-sm">
              {categories.length} categoria{categories.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button asChild className="h-11 shrink-0 md:h-10">
            <Link href={`/${locale}/admin/categorias/novo`}>
              <Plus className="mr-2 size-4" />
              <span className="hidden sm:inline">Nova Categoria</span>
              <span className="sm:hidden">Nova</span>
            </Link>
          </Button>
        </div>

        {categories.length === 0 ? (
          <AdminEmptyState
            icon={FolderTree}
            title="Nenhuma categoria"
            description="Crie a primeira categoria para organizar os produtos."
            action={
              <Button asChild variant="outline" className="h-11">
                <Link href={`/${locale}/admin/categorias/novo`}>
                  <Plus className="mr-2 size-4" />
                  Nova Categoria
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => {
              const ptName =
                cat.category_translations.find((t) => t.locale === "pt")?.name ??
                cat.slug;
              return (
                <Card key={cat.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-4 sm:p-5">
                    <Link
                      href={`/${locale}/admin/categorias/${cat.id}`}
                      className="flex min-w-0 flex-1 items-center gap-4"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <FolderTree className="size-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{ptName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {cat.slug}
                        </p>
                      </div>
                    </Link>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge variant="outline" className="hidden sm:inline-flex">
                        {cat.category_translations.length} traduç
                        {cat.category_translations.length !== 1 ? "ões" : "ão"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-11 p-0 md:size-9"
                        asChild
                      >
                        <Link
                          href={`/${locale}/admin/categorias/${cat.id}`}
                          aria-label={`Editar ${ptName}`}
                        >
                          <Edit className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-11 p-0 md:size-9"
                        onClick={() => setDeleteTarget(cat)}
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
          title="Excluir categoria"
          description={
            deleteTarget
              ? `"${
                  deleteTarget.category_translations.find((t) => t.locale === "pt")
                    ?.name ?? deleteTarget.slug
                }" será excluída permanentemente.`
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
            Os produtos da categoria não são excluídos — apenas ficam sem
            categoria.
          </p>
        </ResponsiveOverlay>
      </div>
    </PullToRefresh>
  );
}
