"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Film, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AdminEmptyState } from "../_components/ui/admin-empty-state";
import { AdminErrorState } from "../_components/ui/admin-error-state";
import { ListPageSkeleton } from "../_components/ui/admin-skeletons";
import { PullToRefresh } from "../_components/ui/pull-to-refresh";

interface MediaResource {
  secure_url: string;
  public_id: string;
  resource_type: "image" | "video";
  bytes: number;
  created_at: string;
  format: string;
}

type TypeFilter = "all" | "image" | "video";

export default function AdminMediaPage() {
  const [type, setType] = useState<TypeFilter>("all");
  const [resources, setResources] = useState<MediaResource[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchMedia = useCallback(
    async (filter: TypeFilter, cursor?: string, opts: { silent?: boolean } = {}) => {
      const isLoadMore = !!cursor;
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        if (!opts.silent) setLoading(true);
        setLoadError(false);
      }

      try {
        const params = new URLSearchParams({ type: filter });
        if (cursor) params.set("cursor", cursor);
        const res = await fetch(`/api/admin/media?${params}`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setResources((prev) => (isLoadMore ? [...prev, ...data.resources] : data.resources));
        setNextCursor(data.next_cursor ?? null);
      } catch {
        if (isLoadMore) {
          toast.error("Erro ao carregar mídia");
        } else {
          setLoadError(true);
        }
      } finally {
        if (isLoadMore) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    setResources([]);
    setNextCursor(null);
    fetchMedia(type);
  }, [type, fetchMedia]);

  async function copyUrl(url: string, publicId: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(publicId);
      toast.success("URL copiada!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  const tabs: { label: string; value: TypeFilter }[] = [
    { label: "Todos", value: "all" },
    { label: "Fotos", value: "image" },
    { label: "Vídeos", value: "video" },
  ];

  const header = (
    <div className="flex items-center justify-between border-b pb-4">
      <div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-[0.15em]">
          Biblioteca de Mídia
        </h1>
        <p className="mt-1 text-sm text-muted-foreground font-mono">
          Todos os arquivos enviados para o Supabase Storage
        </p>
      </div>
    </div>
  );

  if (loading) {
    return <ListPageSkeleton variant="cards" count={6} />;
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        {header}
        <AdminErrorState
          message="Não foi possível carregar a mídia."
          onRetry={() => fetchMedia(type)}
        />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={() => fetchMedia(type, undefined, { silent: true })}>
      <div className="space-y-6">
        {/* Page header */}
        {header}

        {/* Type filter */}
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setType(tab.value)}
              className={cn(
                "min-h-11 px-4 py-1.5 text-xs font-mono uppercase tracking-widest rounded-md transition-colors md:min-h-0",
                type === tab.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {resources.length === 0 ? (
          <AdminEmptyState
            icon={ImageIcon}
            title="Nenhuma mídia encontrada"
            description="Os arquivos enviados para o storage aparecem aqui."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {resources.map((r) => {
                const video = r.resource_type === "video";
                const isCopied = copiedId === r.public_id;
                return (
                  <div
                    key={r.public_id}
                    className="group relative aspect-square rounded-xl border overflow-hidden bg-secondary"
                  >
                    {video ? (
                      <video
                        src={r.secure_url}
                        className="h-full w-full object-cover"
                        muted
                        preload="metadata"
                      />
                    ) : (
                      <Image
                        src={r.secure_url}
                        alt={r.public_id}
                        fill
                        sizes="180px"
                        className="object-cover"
                      />
                    )}

                    {/* Type badge */}
                    <Badge
                      variant="secondary"
                      className="absolute top-1.5 left-1.5 gap-1 px-1.5 py-0.5 text-[10px] bg-background/80 backdrop-blur-sm"
                    >
                      {video ? <Film className="size-3" /> : <ImageIcon className="size-3" />}
                      {video ? "Vídeo" : "Foto"}
                    </Badge>

                    {/* Copy URL overlay on hover/focus */}
                    <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => copyUrl(r.secure_url, r.public_id)}
                        aria-label={`Copiar URL de ${r.public_id}`}
                        className="flex min-h-11 items-center gap-1.5 rounded-md bg-background px-3 py-1.5 text-xs font-mono font-medium transition-colors hover:bg-background/90 md:min-h-0"
                      >
                        {isCopied ? (
                          <Check className="size-3.5 text-primary" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        {isCopied ? "Copiado!" : "Copiar URL"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {nextCursor && (
              <div className="flex justify-center pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 md:h-10"
                  disabled={loadingMore}
                  onClick={() => fetchMedia(type, nextCursor)}
                >
                  {loadingMore && <Loader2 className="size-4 animate-spin mr-2" />}
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </PullToRefresh>
  );
}
