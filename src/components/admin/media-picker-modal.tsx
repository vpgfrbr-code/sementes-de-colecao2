"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageWithSkeleton } from "@/components/ui/image-with-skeleton";
import { Check, Film, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface MediaResource {
  secure_url: string;
  public_id: string;
  resource_type: "image" | "video";
  bytes: number;
  created_at: string;
  format: string;
}

type TypeFilter = "all" | "image" | "video";

interface MediaPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (urls: string[]) => void;
}

function isVideoResource(r: MediaResource) {
  return r.resource_type === "video";
}

export function MediaPickerModal({ open, onOpenChange, onSelect }: MediaPickerModalProps) {
  const [type, setType] = useState<TypeFilter>("all");
  const [resources, setResources] = useState<MediaResource[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchMedia = useCallback(async (filter: TypeFilter, cursor?: string) => {
    const isLoadMore = !!cursor;
    isLoadMore ? setLoadingMore(true) : setLoading(true);

    try {
      const params = new URLSearchParams({ type: filter });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/admin/media?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setResources((prev) => (isLoadMore ? [...prev, ...data.resources] : data.resources));
      setNextCursor(data.next_cursor ?? null);
    } finally {
      isLoadMore ? setLoadingMore(false) : setLoading(false);
    }
  }, []);

  // Reset and fetch when dialog opens or filter changes
  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setResources([]);
    setNextCursor(null);
    fetchMedia(type);
  }, [open, type, fetchMedia]);

  function toggleSelect(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function handleConfirm() {
    onSelect(Array.from(selected));
    onOpenChange(false);
    setSelected(new Set());
  }

  const tabs: { label: string; value: TypeFilter }[] = [
    { label: "Todos", value: "all" },
    { label: "Fotos", value: "image" },
    { label: "Vídeos", value: "video" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="font-display text-lg tracking-wide uppercase">
            Biblioteca de Mídia
          </DialogTitle>
          <DialogDescription className="sr-only">
            Selecione uma imagem ou vídeo já enviado.
          </DialogDescription>
          {/* Type filter */}
          <div className="flex gap-1 mt-3">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setType(tab.value)}
                className={cn(
                  "px-3 py-1 text-xs font-mono uppercase tracking-widest rounded-md transition-colors",
                  type === tab.value
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Grid area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ImageIcon className="size-10 mb-3 opacity-40" />
              <p className="text-sm">Nenhuma mídia encontrada</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {resources.map((r) => {
                  const isSelected = selected.has(r.secure_url);
                  const video = isVideoResource(r);
                  return (
                    <button
                      key={r.public_id}
                      type="button"
                      onClick={() => toggleSelect(r.secure_url)}
                      className={cn(
                        "group relative aspect-square rounded-lg overflow-hidden border-2 transition-all focus:outline-none",
                        isSelected
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-transparent hover:border-primary/40"
                      )}
                    >
                      {video ? (
                        <video
                          src={r.secure_url}
                          className="h-full w-full object-cover"
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <ImageWithSkeleton
                          src={r.secure_url}
                          alt={r.public_id}
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      )}

                      {/* Type badge */}
                      <Badge
                        variant="secondary"
                        className="absolute top-1 left-1 gap-1 px-1 py-0 text-[9px] bg-background/80 backdrop-blur-sm"
                      >
                        {video ? <Film className="size-2.5" /> : <ImageIcon className="size-2.5" />}
                        {video ? "Vídeo" : "Foto"}
                      </Badge>

                      {/* Selection checkmark */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="size-3.5" />
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Load more */}
              {nextCursor && (
                <div className="flex justify-center mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loadingMore}
                    onClick={() => fetchMedia(type, nextCursor)}
                  >
                    {loadingMore ? (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    ) : null}
                    Carregar mais
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground font-mono">
            {selected.size > 0
              ? `${selected.size} selecionado${selected.size > 1 ? "s" : ""}`
              : "Clique para selecionar"}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selected.size === 0}
              onClick={handleConfirm}
            >
              Adicionar{selected.size > 0 ? ` (${selected.size})` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
