"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload, Check, Loader2, FileText, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentProofUploadProps {
  orderId: string;
  hasExistingProof?: boolean;
  onSuccess?: (newStatus: string) => void;
}

const ALLOWED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.pdf";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function PaymentProofUpload({
  orderId,
  hasExistingProof = false,
  onSuccess,
}: PaymentProofUploadProps) {
  const t = useTranslations("order");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(hasExistingProof);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const validateFile = useCallback(
    (f: File): string | null => {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];
      if (!allowedTypes.includes(f.type)) {
        return t("proofUploadInvalidType");
      }
      if (f.size > MAX_FILE_SIZE) {
        return t("proofUploadTooLarge");
      }
      return null;
    },
    [t]
  );

  const handleFileSelect = useCallback(
    (f: File) => {
      setError(null);
      const validationError = validateFile(f);
      if (validationError) {
        setError(validationError);
        return;
      }
      setFile(f);
      setUploaded(false);

      // Generate preview for images
      if (f.type.startsWith("image/")) {
        const url = URL.createObjectURL(f);
        setPreview(url);
      } else {
        setPreview(null);
      }
    },
    [validateFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFile = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      // Step 1: Request a signed upload URL from our API
      const urlRes = await fetch(`/api/order/${orderId}/upload-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request-url",
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      if (!urlRes.ok) {
        const data = await urlRes.json();
        setError(data.error ?? t("proofUploadError"));
        return;
      }

      const { signedUrl, token, storagePath } = await urlRes.json();

      // Step 2: Upload file directly to Supabase Storage (bypasses Vercel)
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          ...(token ? { "x-upsert": "true" } : {}),
        },
        body: file,
      });

      if (!uploadRes.ok) {
        setError(t("proofUploadError"));
        return;
      }

      // Step 3: Confirm upload and update order status
      const confirmRes = await fetch(`/api/order/${orderId}/upload-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          storagePath,
        }),
      });

      if (confirmRes.ok) {
        const data = await confirmRes.json();
        setUploaded(true);
        setFile(null);
        if (preview) {
          URL.revokeObjectURL(preview);
          setPreview(null);
        }
        onSuccess?.(data.status);
      } else {
        const data = await confirmRes.json();
        setError(data.error ?? t("proofUploadError"));
      }
    } catch {
      setError(t("proofUploadError"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Info notice about 24h delay */}
      <div className="flex gap-2.5 border border-foreground/15 bg-secondary/30 p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-foreground/50" />
        <p className="font-mono text-[10px] leading-relaxed uppercase tracking-[0.1em] text-foreground/60">
          {t("proofUploadDescription")}
        </p>
      </div>

      {/* Upload success state */}
      {uploaded && !file && (
        <div className="flex items-center justify-between border border-foreground/20 bg-secondary/20 p-3">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-foreground/60" />
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/60">
              {t("proofUploadSuccess")}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto rounded-none p-1 font-mono text-[9px] uppercase tracking-[0.1em] text-foreground/40 hover:text-foreground/60"
            onClick={() => {
              setUploaded(false);
              fileInputRef.current?.click();
            }}
          >
            {t("proofUploadReplace")}
          </Button>
        </div>
      )}

      {/* Drop zone / file selected */}
      {!uploaded && (
        <>
          {!file ? (
            <div
              role="button"
              tabIndex={0}
              className={`flex cursor-pointer flex-col items-center gap-3 border-2 border-dashed p-6 transition-colors ${
                dragOver
                  ? "border-foreground/40 bg-secondary/40"
                  : "border-foreground/15 bg-muted/20 hover:border-foreground/30 hover:bg-muted/30"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-6 w-6 text-foreground/30" />
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/40">
                {t("proofDragDrop")}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-foreground/25">
                {t("proofUploadHint")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 border border-foreground/15 p-3">
              {/* Preview */}
              <div className="flex items-center gap-3">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Preview"
                    className="h-16 w-16 border border-foreground/10 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center border border-foreground/10 bg-muted">
                    <FileText className="h-6 w-6 text-foreground/30" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate font-mono text-[11px] text-foreground/70">
                    {file.name}
                  </p>
                  <p className="font-mono text-[9px] text-foreground/40">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto shrink-0 rounded-none p-1"
                  onClick={clearFile}
                >
                  <X className="h-4 w-4 text-foreground/40" />
                </Button>
              </div>

              {/* Upload button */}
              <Button
                className="w-full gap-2 rounded-none font-mono text-[11px] font-bold uppercase tracking-[0.15em]"
                onClick={uploadFile}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {t("proofUploadBtn")}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Error */}
      {error && (
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-destructive">
          {error}
        </p>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS}
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
