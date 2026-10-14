"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Crop, Loader2, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface BannerCropperProps {
  imageUrl: string;
  open: boolean;
  onComplete: (urls: { desktop: string; mobile: string }) => void;
  onCancel: () => void;
  folder?: string;
}

const STEPS = [
  { key: "desktop" as const, label: "Desktop", aspect: 21 / 9, icon: Monitor },
  { key: "mobile" as const, label: "Mobile", aspect: 4 / 5, icon: Smartphone },
];

async function getCroppedBlob(
  imageSrc: string,
  cropArea: Area
): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = cropArea.width;
  canvas.height = cropArea.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    cropArea.width,
    cropArea.height
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      "image/webp",
      0.9
    );
  });
}

async function uploadBlob(blob: Blob, folder: string, suffix: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", new File([blob], `banner-${suffix}-${Date.now()}.webp`, { type: "image/webp" }));
  formData.append("folder", folder);

  const res = await fetch("/api/admin/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Upload failed");
  const { url } = await res.json();
  return url;
}

export function BannerCropper({
  imageUrl,
  open,
  onComplete,
  onCancel,
  folder = "banners",
}: BannerCropperProps) {
  const [step, setStep] = useState(0);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [desktopUrl, setDesktopUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currentStep = STEPS[step]!;

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const resetCrop = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, []);

  async function handleNext() {
    if (!croppedAreaPixels) return;
    setSaving(true);

    try {
      const blob = await getCroppedBlob(imageUrl, croppedAreaPixels);
      const url = await uploadBlob(blob, folder, currentStep.key);

      if (step === 0) {
        // Desktop done, go to mobile
        setDesktopUrl(url);
        setStep(1);
        resetCrop();
      } else {
        // Mobile done, finish
        onComplete({ desktop: desktopUrl!, mobile: url });
        // Reset for next use
        setStep(0);
        setDesktopUrl(null);
        resetCrop();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setStep(0);
    setDesktopUrl(null);
    resetCrop();
    onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="size-5" />
            Recortar Imagem
          </DialogTitle>
          <DialogDescription className="sr-only">
            Ajuste o recorte da imagem para desktop e mobile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div
                  key={s.key}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isDone
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {s.label}
                  <span className="text-xs opacity-70">
                    ({s.key === "desktop" ? "21:9" : "4:5"})
                  </span>
                </div>
              );
            })}
          </div>

          {/* Crop area */}
          <div className="relative h-[400px] w-full overflow-hidden rounded-xl bg-foreground">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={currentStep.aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Zoom control */}
          <div className="flex items-center gap-3">
            <Label className="text-sm text-muted-foreground shrink-0">Zoom</Label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <span className="text-xs text-muted-foreground font-mono w-10 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleNext} disabled={saving || !croppedAreaPixels}>
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              {step === 0 ? "Próximo (Mobile)" : "Aplicar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
