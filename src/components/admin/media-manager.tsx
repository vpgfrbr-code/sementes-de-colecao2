"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ImageWithSkeleton } from "@/components/ui/image-with-skeleton";
import { toast } from "sonner";
import {
  ImageIcon,
  Film,
  Plus,
  Trash2,
  GripVertical,
  Play,
  Link as LinkIcon,
  Upload,
  Loader2,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MediaPickerModal } from "@/components/admin/media-picker-modal";

function isVideo(url: string) {
  return /\.(mp4|webm|mov)($|\?)/i.test(url);
}

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";

interface MediaManagerProps {
  value: string[];
  onChange: (urls: string[]) => void;
  /** Supabase Storage folder name. Defaults to "general" */
  folder?: string;
}

export function MediaManager({ value, onChange, folder = "general" }: MediaManagerProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; percent: number } | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addUrl = useCallback(() => {
    const url = inputUrl.trim();
    if (!url) return;
    onChange([...value, url]);
    setInputUrl("");
  }, [inputUrl, value, onChange]);

  const removeUrl = useCallback(
    (idx: number) => {
      onChange(value.filter((_, i) => i !== idx));
    },
    [value, onChange]
  );

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (!fileArray.length) return;

      setUploading(true);
      setUploadCount(fileArray.length);
      const newUrls: string[] = [];

      for (const file of fileArray) {
        try {
          // All uploads go directly from browser to Supabase Storage via a
          // short-lived signed URL. This bypasses the Hostinger/Vercel
          // request-body size limit and works for both images and videos.
          const sigRes = await fetch("/api/admin/upload/signed-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              folder,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
            }),
          });

          if (!sigRes.ok) {
            const body = await sigRes.json().catch(() => ({}));
            toast.error(`Upload error: ${body?.error ?? "Failed to get signed upload URL"}`);
            continue;
          }

          const { signedUrl, publicUrl } = (await sigRes.json()) as {
            signedUrl: string;
            path: string;
            publicUrl: string;
          };

          setUploadProgress({ name: file.name, percent: 0 });

          const ok = await new Promise<boolean>((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                setUploadProgress({
                  name: file.name,
                  percent: Math.round((e.loaded / e.total) * 100),
                });
              }
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve(true);
              } else {
                toast.error(`Upload failed (${xhr.status})`);
                resolve(false);
              }
            };
            xhr.onerror = () => {
              toast.error("Upload failed: network error");
              resolve(false);
            };
            xhr.open("PUT", signedUrl);
            // Must match the Content-Type used when signing the URL on the
            // server (R2/S3 signature verification).
            xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
            xhr.send(file);
          });

          setUploadProgress(null);
          if (ok) newUrls.push(publicUrl);
        } catch {
          toast.error("Upload failed: network error");
        }
      }

      if (newUrls.length) {
        onChange([...value, ...newUrls]);
      }
      setUploading(false);
      setUploadCount(0);
      setUploadProgress(null);
    },
    [value, onChange, folder]
  );

  // Ctrl+V paste-to-upload: listen for paste events with image data
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      // Don't intercept paste in text inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        uploadFiles(imageFiles);
      }
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [uploadFiles]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        uploadFiles(e.target.files);
        e.target.value = "";
      }
    },
    [uploadFiles]
  );

  const handleDropZone = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDropActive(false);
      if (e.dataTransfer.files.length) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles]
  );

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault();
      if (dragIdx === null || dragIdx === idx) return;
      setDragOverIdx(idx);
    },
    [dragIdx]
  );

  const handleDrop = useCallback(
    (idx: number) => {
      if (dragIdx === null || dragIdx === idx) return;
      const updated = [...value];
      const moved = updated.splice(dragIdx, 1)[0];
      if (moved !== undefined) updated.splice(idx, 0, moved);
      onChange(updated);
      setDragIdx(null);
      setDragOverIdx(null);
    },
    [dragIdx, value, onChange]
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <ImageIcon className="size-4" />
        Mídia (Fotos e Vídeos)
      </Label>

      {/* Media grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((url, idx) => {
            const video = isVideo(url);
            return (
              <div
                key={`${url}-${idx}`}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "group relative aspect-square rounded-xl border-2 overflow-hidden bg-secondary transition-all",
                  dragIdx === idx && "opacity-40 scale-95",
                  dragOverIdx === idx &&
                    dragIdx !== idx &&
                    "border-primary ring-2 ring-primary/20",
                  dragIdx === null && "border-border hover:border-primary/40"
                )}
              >
                {/* Preview */}
                {video ? (
                  <div className="relative h-full w-full">
                    <video
                      src={url}
                      className="h-full w-full object-cover"
                      muted
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-foreground/30">
                      <Play className="size-8 text-primary-foreground fill-primary-foreground/80" />
                    </div>
                  </div>
                ) : (
                  <ImageWithSkeleton
                    src={url}
                    alt={`Media ${idx + 1}`}
                    fill
                    sizes="150px"
                    className="object-cover"
                  />
                )}

                {/* Type badge */}
                <Badge
                  variant="secondary"
                  className="absolute top-1.5 left-1.5 gap-1 px-1.5 py-0.5 text-[10px] bg-background/80 backdrop-blur-sm"
                >
                  {video ? (
                    <Film className="size-3" />
                  ) : (
                    <ImageIcon className="size-3" />
                  )}
                  {video ? "Vídeo" : "Foto"}
                </Badge>

                {/* Order number */}
                <span className="absolute bottom-1.5 left-1.5 flex size-5 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm text-[10px] font-mono font-bold">
                  {idx + 1}
                </span>

                {/* Drag handle + Delete */}
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    className="flex size-6 items-center justify-center rounded-md bg-background/80 backdrop-blur-sm cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeUrl(idx)}
                    className="flex size-6 items-center justify-center rounded-md bg-destructive/80 backdrop-blur-sm text-destructive-foreground hover:bg-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
        onDragLeave={() => setDropActive(false)}
        onDrop={handleDropZone}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 text-muted-foreground cursor-pointer transition-colors",
          dropActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
          uploading && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        {uploading ? (
          <>
            <Loader2 className="size-8 animate-spin opacity-60 mb-2" />
            {uploadProgress ? (
              <div className="w-full max-w-xs space-y-1.5 px-4">
                <p className="text-sm truncate text-center">{uploadProgress.name}</p>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-150"
                    style={{ width: `${uploadProgress.percent}%` }}
                  />
                </div>
                <p className="text-xs text-center tabular-nums text-muted-foreground">{uploadProgress.percent}%</p>
              </div>
            ) : (
              <p className="text-sm">Enviando {uploadCount} arquivo{uploadCount > 1 ? "s" : ""}...</p>
            )}
          </>
        ) : (
          <>
            <Upload className="size-8 opacity-40 mb-2" />
            <p className="text-sm font-medium">Clique ou arraste arquivos aqui</p>
            <p className="text-xs opacity-60 mt-1">
              JPG, PNG, WebP, GIF, MP4, WebM (max 12MB)
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setPickerOpen(true); }}
              className="mt-3 flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors bg-background"
            >
              <LayoutGrid className="size-3.5" />
              Biblioteca
            </button>
          </>
        )}
      </div>

      {/* Add URL input (fallback) */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
            placeholder="Cole URL da foto ou vídeo (.png, .jpg, .mp4, .webm...)"
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={addUrl}
          disabled={!inputUrl.trim()}
        >
          <Plus className="size-4 mr-1" />
          Adicionar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Arraste os itens para reordenar. Vídeos aceitos: .mp4, .webm, .mov
      </p>

      <MediaPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(urls) => onChange([...value, ...urls])}
      />
    </div>
  );
}
