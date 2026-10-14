"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  Edit,
  Film,
  GripVertical,
  Image as ImageIcon,
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

function isVideo(url: string) {
  return /\.(mp4|webm|mov)($|\?)/i.test(url);
}

interface Translation {
  locale: string;
  title: string;
  subtitle: string;
}

interface Banner {
  id: string;
  image_url: string;
  image_url_mobile: string | null;
  media_type: string;
  link: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  hero_banner_translations: Translation[];
}

export default function AdminBannersPage() {
  const locale = useLocale();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  async function fetchBanners(opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/admin/banners");
      if (!res.ok) throw new Error("fetch failed");
      setBanners(await res.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(banner: Banner) {
    await runMutation({
      url: `/api/admin/banners/${banner.id}`,
      method: "PUT",
      body: { active: !banner.active },
      successMessage: banner.active ? "Banner desativado" : "Banner ativado",
      errorMessage: "Falha ao atualizar o banner.",
      onSuccess: () =>
        setBanners((prev) =>
          prev.map((b) =>
            b.id === banner.id ? { ...b, active: !banner.active } : b
          )
        ),
    });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await runMutation({
      url: `/api/admin/banners/${deleteTarget.id}`,
      method: "DELETE",
      successMessage: "Banner excluído",
      errorMessage: "Falha ao excluir o banner.",
      onSuccess: () =>
        setBanners((prev) => prev.filter((b) => b.id !== deleteTarget.id)),
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
        <h1 className="text-2xl font-bold tracking-tight">Banners</h1>
        <AdminErrorState
          message="Não foi possível carregar os banners."
          onRetry={() => fetchBanners()}
        />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={() => fetchBanners({ silent: true })}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Banners</h1>
            <p className="text-muted-foreground text-sm">
              {banners.length} banner{banners.length !== 1 ? "s" : ""} no hero da loja
            </p>
          </div>
          <Button asChild className="h-11 shrink-0 md:h-10">
            <Link href={`/${locale}/admin/banners/novo`}>
              <Plus className="mr-2 size-4" />
              <span className="hidden sm:inline">Novo Banner</span>
              <span className="sm:hidden">Novo</span>
            </Link>
          </Button>
        </div>

        {banners.length === 0 ? (
          <AdminEmptyState
            icon={ImageIcon}
            title="Nenhum banner cadastrado."
            description="Crie o primeiro banner para o hero da loja."
            action={
              <Button asChild variant="outline" className="h-11">
                <Link href={`/${locale}/admin/banners/novo`}>
                  <Plus className="mr-2 size-4" />
                  Novo Banner
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {banners.map((banner) => {
              const ptTitle =
                banner.hero_banner_translations.find((t) => t.locale === "pt")
                  ?.title || "Sem título";
              const isBannerVideo =
                banner.media_type === "video" || isVideo(banner.image_url);
              return (
                <Card key={banner.id} className={!banner.active ? "opacity-50" : ""}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <GripVertical className="size-4 text-muted-foreground/40 shrink-0" />

                    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                      {isBannerVideo ? (
                        <video
                          src={banner.image_url}
                          muted
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Image
                          src={banner.image_url}
                          alt={ptTitle}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{ptTitle}</p>
                        {isBannerVideo && (
                          <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0">
                            <Film className="size-3" />
                            Vídeo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Ordem: {banner.sort_order}</span>
                        {banner.link && (
                          <>
                            <span>·</span>
                            <span className="truncate max-w-[200px]">{banner.link}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant={banner.active ? "secondary" : "outline"}
                        className="cursor-pointer"
                        role="button"
                        tabIndex={0}
                        aria-label={
                          banner.active
                            ? `Desativar banner ${ptTitle}`
                            : `Ativar banner ${ptTitle}`
                        }
                        onClick={() => toggleActive(banner)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleActive(banner);
                          }
                        }}
                      >
                        {banner.active ? "Ativo" : "Inativo"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-11 p-0 md:size-9"
                        asChild
                      >
                        <Link
                          href={`/${locale}/admin/banners/${banner.id}`}
                          aria-label={`Editar ${ptTitle}`}
                        >
                          <Edit className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-11 p-0 md:size-9"
                        onClick={() => setDeleteTarget(banner)}
                        aria-label={`Excluir ${ptTitle}`}
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
          title="Excluir banner"
          description={
            deleteTarget
              ? `"${
                  deleteTarget.hero_banner_translations.find(
                    (t) => t.locale === "pt"
                  )?.title || "Sem título"
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
            O banner sai do hero da loja imediatamente. Esta ação não pode ser
            desfeita.
          </p>
        </ResponsiveOverlay>
      </div>
    </PullToRefresh>
  );
}
