"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileImage, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

type Endpoint = "admin" | "client";

interface PaymentProofViewerProps {
  orderId: string;
  proofPath: string;
  /** "admin" -> /api/admin/orders/{id}/proof, "client" -> /api/order/{id}/proof */
  endpoint: Endpoint;
  /** Render a thumbnail trigger instead of a button. */
  thumbnail?: boolean;
  /** Custom button label when not using thumbnail. */
  triggerLabel?: string;
  /** Auto-fetch the signed URL on mount (used in admin detail). */
  autoLoad?: boolean;
  /** Show download button inside the modal (default: admin only). */
  allowDownload?: boolean;
  /** Inline preview of the image below the trigger (admin detail). */
  inlinePreview?: boolean;
  className?: string;
}

const SIGNED_URL_TTL_MS = 5 * 60 * 1000; // 5 minutes — match backend
const RENEW_BEFORE_MS = 30 * 1000; // refresh 30s before expiry

function isPdfPath(path: string) {
  return /\.pdf(\?|$)/i.test(path);
}

export function PaymentProofViewer({
  orderId,
  proofPath,
  endpoint,
  thumbnail = false,
  triggerLabel,
  autoLoad = false,
  allowDownload,
  inlinePreview = false,
  className,
}: PaymentProofViewerProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const fetchedAtRef = useRef<number>(0);
  const inFlightRef = useRef<Promise<string | null> | null>(null);
  // Pinch-zoom (touch): pares de ponteiros ativos + estado do gesto.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const lastTapRef = useRef(0);

  const isPdf = isPdfPath(proofPath);
  const apiUrl =
    endpoint === "admin"
      ? `/api/admin/orders/${orderId}/proof`
      : `/api/order/${orderId}/proof`;
  const downloadEnabled = allowDownload ?? endpoint === "admin";

  const fetchUrl = useCallback(async (): Promise<string | null> => {
    if (inFlightRef.current) return inFlightRef.current;
    setLoading(true);
    setError(null);
    const promise = (async () => {
      try {
        const res = await fetch(apiUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { url?: string };
        if (!data.url) throw new Error("missing url");
        fetchedAtRef.current = Date.now();
        setUrl(data.url);
        return data.url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar comprovante");
        return null;
      } finally {
        setLoading(false);
        inFlightRef.current = null;
      }
    })();
    inFlightRef.current = promise;
    return promise;
  }, [apiUrl]);

  // Auto-load on mount if requested.
  useEffect(() => {
    if (autoLoad && !url && !loading) {
      void fetchUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad]);

  // Auto-renew: when modal is open, refresh signed URL before it expires.
  useEffect(() => {
    if (!open || !url) return;
    const elapsed = Date.now() - fetchedAtRef.current;
    const timeout = Math.max(SIGNED_URL_TTL_MS - RENEW_BEFORE_MS - elapsed, 1000);
    const t = window.setTimeout(() => {
      void fetchUrl();
    }, timeout);
    return () => window.clearTimeout(t);
  }, [open, url, fetchUrl]);

  // Reset zoom when modal closes.
  useEffect(() => {
    if (!open) setZoom(1);
  }, [open]);

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && !url && !loading) {
      await fetchUrl();
    }
  }

  // ── Gestos touch no comprovante: pinça para zoom, double-tap 1x↔2x ──
  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== "touch") return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      if (a && b) {
        pinchRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      }
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()];
      if (!a || !b) return;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const next = (pinchRef.current.zoom * dist) / pinchRef.current.dist;
      setZoom(Math.min(4, Math.max(0.5, next)));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (e.pointerType !== "touch") return;
    const wasPinching = pinchRef.current !== null;
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    // Double-tap: dois toques únicos em < 300ms alternam 1x ↔ 2x.
    if (!wasPinching && pointersRef.current.size === 0) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        setZoom((z) => (z > 1 ? 1 : 2));
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
  }

  const trigger = thumbnail ? (
    <button
      type="button"
      aria-label={triggerLabel ?? "Visualizar comprovante"}
      className={cn(
        "group relative inline-flex size-10 items-center justify-center overflow-hidden rounded-md border bg-muted transition hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
    >
      {isPdf ? (
        <FileImage className="size-4 text-muted-foreground" />
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <FileImage className="size-4 text-muted-foreground/70" />
      )}
    </button>
  ) : (
    <Button variant="outline" size="sm" className={className}>
      {loading ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <FileImage className="mr-2 size-4" />
      )}
      {triggerLabel ?? "Ver comprovante"}
    </Button>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-3">
            <DialogTitle className="text-base">Comprovante de pagamento</DialogTitle>
            <DialogDescription className="text-xs">
              Pedido #{orderId.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          <div
            className="flex max-h-[70vh] min-h-[300px] items-center justify-center overflow-auto overscroll-contain bg-muted/40 p-4 [touch-action:pan-x_pan-y]"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {loading && !url ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : error ? (
              <div className="text-sm text-destructive">
                {error}
                <button
                  className="ml-2 underline"
                  onClick={() => void fetchUrl()}
                >
                  Tentar novamente
                </button>
              </div>
            ) : url ? (
              isPdf ? (
                <embed
                  src={url}
                  type="application/pdf"
                  className="h-[70vh] w-full rounded-md border bg-white"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt="Comprovante de pagamento"
                  draggable={false}
                  className="max-h-[70vh] max-w-full origin-center select-none rounded-md border bg-white object-contain shadow-sm transition-transform"
                  style={{ transform: `scale(${zoom})` }}
                />
              )
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 border-t px-5 py-3">
            <div className="flex items-center gap-1">
              {!isPdf && url && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                    aria-label="Diminuir zoom"
                  >
                    <ZoomOut className="size-4" />
                  </Button>
                  <span className="w-12 text-center font-mono text-xs text-muted-foreground tabular-nums">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                    aria-label="Aumentar zoom"
                  >
                    <ZoomIn className="size-4" />
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {url && (
                <Button asChild variant="ghost" size="sm">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 size-4" />
                    Abrir em nova aba
                  </a>
                </Button>
              )}
              {url && downloadEnabled && (
                <Button asChild size="sm">
                  <a
                    href={url}
                    download={`comprovante-${orderId.slice(0, 8)}`}
                  >
                    <Download className="mr-2 size-4" />
                    Baixar
                  </a>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {inlinePreview && url && !isPdf && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full overflow-hidden rounded-md border bg-muted/30 transition hover:ring-2 hover:ring-primary/30"
          aria-label="Ampliar comprovante"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Comprovante de pagamento"
            className="max-h-96 w-full object-contain"
          />
        </button>
      )}
    </>
  );
}
