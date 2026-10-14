"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Type as TypeIcon, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";

type Mode = "image" | "text";

type Slot = "logoUrl" | "logoInverseUrl" | "faviconUrl" | "ogImageUrl";

interface BrandingRaw {
  mode: Mode;
  brandName: string;
  logoUrl: string | null;
  logoInverseUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
}

interface BrandingResolved extends Omit<BrandingRaw, "logoUrl" | "logoInverseUrl" | "faviconUrl" | "ogImageUrl"> {
  logoUrl: string;
  logoInverseUrl: string;
  faviconUrl: string;
  ogImageUrl: string;
}

const SLOT_META: Record<
  Slot,
  { label: string; hint: string; maxMB: number; previewClass: string; bg: "light" | "dark" }
> = {
  logoUrl: {
    label: "Logo principal",
    hint: "SVG ou PNG, ~242×48. Aparece no header, footer, preloader.",
    maxMB: 2,
    previewClass: "h-10 w-auto max-w-full",
    bg: "light",
  },
  logoInverseUrl: {
    label: "Logo inverso (fundo escuro)",
    hint: "SVG ou PNG, ~1660×326. Aparece no watermark do hero e admin.",
    maxMB: 2,
    previewClass: "h-10 w-auto max-w-full",
    bg: "dark",
  },
  faviconUrl: {
    label: "Favicon",
    hint: "SVG quadrado, ~32×32. Aba do navegador.",
    maxMB: 1,
    previewClass: "size-8",
    bg: "light",
  },
  ogImageUrl: {
    label: "Open Graph (compartilhamento social)",
    hint: "PNG ou JPG 1200×630. Aparece em WhatsApp, Telegram, Twitter.",
    maxMB: 4,
    previewClass: "h-20 w-auto max-w-full rounded",
    bg: "light",
  },
};

const ACCEPT_BY_SLOT: Record<Slot, string> = {
  logoUrl: "image/svg+xml,image/png,image/jpeg,image/webp",
  logoInverseUrl: "image/svg+xml,image/png,image/jpeg,image/webp",
  faviconUrl: "image/svg+xml,image/png",
  ogImageUrl: "image/png,image/jpeg,image/webp",
};

export function BrandingSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [raw, setRaw] = useState<BrandingRaw>({
    mode: "image",
    brandName: "HighBreed",
    logoUrl: null,
    logoInverseUrl: null,
    faviconUrl: null,
    ogImageUrl: null,
  });
  const [resolved, setResolved] = useState<BrandingResolved | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [rawRes, resolvedRes] = await Promise.all([
        fetch("/api/admin/settings/branding?raw=1", { cache: "no-store" }),
        fetch("/api/admin/settings/branding", { cache: "no-store" }),
      ]);
      if (rawRes.ok) setRaw(await rawRes.json());
      if (resolvedRes.ok) setResolved(await resolvedRes.json());
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!raw.brandName.trim()) {
      setMessage("Informe o nome da marca.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(raw),
      });
      if (res.ok) {
        setMessage("Configuração salva.");
        router.refresh();
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error ?? "Falha ao salvar.");
      }
    } catch {
      setMessage("Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  function setSlot(slot: Slot, value: string | null) {
    setRaw((s) => ({ ...s, [slot]: value }));
  }

  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Marca / Branding
        </h2>
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-lg font-semibold tracking-tight">
        Marca / Branding
      </h2>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold">
              Identidade visual
            </span>
            <Badge variant="outline" className="text-xs">
              {raw.mode === "image" ? "Logo (imagem)" : "Apenas texto"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-xs text-muted-foreground">
            Define o que aparece no header, footer, preloader, age-gate, painel
            admin, favicon, compartilhamentos sociais e emails transacionais.
            Sem cache: alterações refletem na próxima requisição.
          </p>

          <div className="space-y-3">
            <Label className="text-sm">Modo de exibição</Label>
            <RadioGroup
              value={raw.mode}
              onValueChange={(v) =>
                setRaw((s) => ({ ...s, mode: v as Mode }))
              }
              className="grid gap-3 sm:grid-cols-2"
            >
              <Label
                htmlFor="brand-mode-image"
                className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem value="image" id="brand-mode-image" />
                <div className="space-y-0.5">
                  <span className="font-medium text-sm">Logo (imagem)</span>
                  <p className="text-[11px] text-muted-foreground">
                    Usa SVG/PNG nos 4 slots abaixo.
                  </p>
                </div>
              </Label>
              <Label
                htmlFor="brand-mode-text"
                className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem value="text" id="brand-mode-text" />
                <div className="space-y-0.5">
                  <span className="inline-flex items-center gap-1.5 font-medium text-sm">
                    <TypeIcon className="size-3.5" />
                    Apenas texto
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Renderiza o nome da marca em fonte do tema.
                  </p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-name" className="text-sm">
              Nome da marca
            </Label>
            <Input
              id="brand-name"
              value={raw.brandName}
              onChange={(e) =>
                setRaw((s) => ({ ...s, brandName: e.target.value.slice(0, 80) }))
              }
              maxLength={80}
              className="font-display"
              placeholder="HighBreed"
            />
            <p className="text-[11px] text-muted-foreground">
              Usado como alt-text dos logos e como conteúdo no modo texto.
            </p>
          </div>

          {raw.mode === "image" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {(Object.keys(SLOT_META) as Slot[]).map((slot) => (
                <BrandAssetUploader
                  key={slot}
                  slot={slot}
                  rawUrl={raw[slot]}
                  resolvedUrl={resolved ? resolved[slot] : null}
                  onChange={(url) => setSlot(slot, url)}
                  onError={setMessage}
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Salvar configuração
            </Button>
            {message && (
              <span className="text-xs text-muted-foreground">{message}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

interface BrandAssetUploaderProps {
  slot: Slot;
  rawUrl: string | null;
  resolvedUrl: string | null;
  onChange: (url: string | null) => void;
  onError: (msg: string) => void;
}

function BrandAssetUploader({
  slot,
  rawUrl,
  resolvedUrl,
  onChange,
  onError,
}: BrandAssetUploaderProps) {
  const meta = SLOT_META[slot];
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const isCustom = rawUrl !== null;
  const previewSrc = rawUrl ?? resolvedUrl;

  async function pickFile(file: File) {
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > meta.maxMB) {
      onError(`${meta.label}: arquivo excede ${meta.maxMB}MB.`);
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("slot", slot);
      form.append("file", file);
      const res = await fetch("/api/admin/branding/upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        onError(err.error ?? `Falha ao enviar ${meta.label}.`);
        return;
      }
      const data: { publicUrl: string } = await res.json();
      onChange(data.publicUrl);
    } catch {
      onError(`Falha ao enviar ${meta.label}.`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">{meta.label}</Label>
        <Badge
          variant={isCustom ? "default" : "outline"}
          className="text-[10px]"
        >
          {isCustom ? "Personalizado" : "Padrão"}
        </Badge>
      </div>

      <div
        className={
          "flex min-h-[88px] items-center justify-center rounded-md p-3 " +
          (meta.bg === "dark" ? "bg-foreground" : "bg-muted/40")
        }
      >
        {previewSrc ? (
          <Image
            src={previewSrc}
            alt={meta.label}
            width={400}
            height={120}
            className={meta.previewClass}
            unoptimized
          />
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Sem preview
          </span>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">{meta.hint}</p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_BY_SLOT[slot]}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void pickFile(f);
          }}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <Upload className="mr-1.5 size-3.5" />
          )}
          Trocar arquivo
        </Button>
        {isCustom && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange(null)}
            disabled={uploading}
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            Resetar para padrão
          </Button>
        )}
      </div>
    </div>
  );
}
