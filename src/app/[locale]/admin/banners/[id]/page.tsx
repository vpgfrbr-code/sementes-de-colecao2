"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MediaManager } from "@/components/admin/media-manager";
import { BannerCropper } from "@/components/admin/banner-cropper";
import {
  useAdminSaveRegistration,
  useDirtySnapshot,
} from "../../_components/admin-save-context";

const LOCALES = ["pt", "en", "es"] as const;
const LOCALE_LABELS = { pt: "Português", en: "English", es: "Español" };

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
  hero_banner_translations: Translation[];
}

interface LinkOption {
  label: string;
  value: string;
}

export default function EditBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formImageUrl, setFormImageUrl] = useState("");
  const [formImageUrlMobile, setFormImageUrlMobile] = useState("");
  const [formMediaType, setFormMediaType] = useState<"image" | "video">("image");
  const [formLink, setFormLink] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formActive, setFormActive] = useState(true);
  const [formTranslations, setFormTranslations] = useState(
    LOCALES.map((l) => ({ locale: l, title: "", subtitle: "" }))
  );

  const [linkOptions, setLinkOptions] = useState<LinkOption[]>([]);
  const [linkDropdownOpen, setLinkDropdownOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkMode, setLinkMode] = useState<"product" | "custom" | "none">("none");

  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageUrl, setCropperImageUrl] = useState("");
  const { isDirty } = useDirtySnapshot(
    {
      formImageUrl,
      formImageUrlMobile,
      formMediaType,
      formLink,
      formSortOrder,
      formActive,
      formTranslations,
    },
    !loading
  );

  useAdminSaveRegistration({
    label: "Salvar",
    canSave: Boolean(formImageUrl.trim()),
    saving,
    dirty: isDirty,
    onSave: handleSave,
  });

  const detectLinkMode = useCallback(
    (link: string, options: LinkOption[]) => {
      if (!link) {
        setLinkMode("none");
      } else if (options.some((o) => o.value === link)) {
        setLinkMode("product");
      } else {
        setLinkMode("custom");
      }
    },
    []
  );

  useEffect(() => {
    async function load() {
      try {
        const [bannersRes, optionsRes] = await Promise.all([
          fetch("/api/admin/banners"),
          fetch("/api/admin/banners/link-options"),
        ]);

        let options: LinkOption[] = [];
        if (optionsRes.ok) {
          options = await optionsRes.json();
          setLinkOptions(options);
        }

        if (bannersRes.ok) {
          const data: Banner[] = await bannersRes.json();
          const banner = data.find((b) => b.id === id);
          if (banner) {
            setFormImageUrl(banner.image_url);
            setFormImageUrlMobile(banner.image_url_mobile ?? "");
            setFormMediaType(
              banner.media_type === "video" || isVideo(banner.image_url)
                ? "video"
                : "image"
            );
            setFormLink(banner.link);
            setFormSortOrder(banner.sort_order);
            setFormActive(banner.active);
            setFormTranslations(
              LOCALES.map((l) => {
                const existing = banner.hero_banner_translations.find(
                  (t) => t.locale === l
                );
                return {
                  locale: l,
                  title: existing?.title ?? "",
                  subtitle: existing?.subtitle ?? "",
                };
              })
            );
            detectLinkMode(banner.link, options);
          }
        }
      } catch {
        toast.error("Não foi possível carregar os dados.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, detectLinkMode]);

  function handleMediaChange(urls: string[]) {
    const url = urls[0] ?? "";
    if (!url) {
      setFormImageUrl("");
      setFormImageUrlMobile("");
      setFormMediaType("image");
      return;
    }
    if (isVideo(url)) {
      setFormImageUrl(url);
      setFormImageUrlMobile("");
      setFormMediaType("video");
    } else {
      setCropperImageUrl(url);
      setCropperOpen(true);
    }
  }

  function handleCropComplete(urls: { desktop: string; mobile: string }) {
    setFormImageUrl(urls.desktop);
    setFormImageUrlMobile(urls.mobile);
    setFormMediaType("image");
    setCropperOpen(false);
    setCropperImageUrl("");
  }

  function handleCropCancel() {
    setCropperOpen(false);
    setCropperImageUrl("");
  }

  async function handleSave() {
    if (!formImageUrl.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: formImageUrl,
          image_url_mobile: formImageUrlMobile || null,
          media_type: formMediaType,
          link: formLink,
          sort_order: formSortOrder,
          active: formActive,
          translations: formTranslations,
        }),
      });
      if (res.ok) {
        toast.success("Banner salvo");
        router.push(`/${locale}/admin/banners`);
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Falha ao salvar o banner.");
      }
    } catch {
      toast.error("Falha ao salvar o banner.");
    } finally {
      setSaving(false);
    }
  }

  const filteredOptions = linkOptions.filter((o) =>
    o.label.toLowerCase().includes(linkSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/admin/banners`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Editar Banner</h1>
      </div>

      <Card>
        <CardContent className="space-y-6 p-4 sm:p-6">
          {/* Media */}
          <div className="space-y-2">
            <Label>Imagem ou Vídeo</Label>
            <MediaManager
              value={formImageUrl ? [formImageUrl] : []}
              onChange={handleMediaChange}
              folder="banners"
            />
            {formMediaType === "image" && formImageUrlMobile && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ImageIcon className="size-3" />
                <span>Recorte mobile configurado</span>
              </div>
            )}
            {formMediaType === "video" && formImageUrl && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Film className="size-3" />
                <span>Vídeo detectado (sem recorte)</span>
              </div>
            )}
          </div>

          {/* Link + Sort */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Link (destino ao clicar)</Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLinkDropdownOpen(!linkDropdownOpen)}
                  className="flex w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent/50 transition-colors"
                >
                  <span className="truncate text-left">
                    {linkMode === "none" && (
                      <span className="text-muted-foreground">Selecione...</span>
                    )}
                    {linkMode === "product" && (
                      <span className="flex items-center gap-1.5">
                        <LinkIcon className="size-3 shrink-0" />
                        {linkOptions.find((o) => o.value === formLink)?.label ?? formLink}
                      </span>
                    )}
                    {linkMode === "custom" && (
                      <span className="flex items-center gap-1.5">
                        <ExternalLink className="size-3 shrink-0" />
                        {formLink || "URL personalizada"}
                      </span>
                    )}
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                </button>

                {linkDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setLinkDropdownOpen(false)}
                    />
                    <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg">
                      <div className="flex items-center gap-2 border-b px-3 py-2">
                        <Search className="size-4 text-muted-foreground shrink-0" />
                        <input
                          type="text"
                          value={linkSearch}
                          onChange={(e) => setLinkSearch(e.target.value)}
                          placeholder="Buscar produto..."
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-[200px] overflow-y-auto p-1">
                        <button
                          type="button"
                          onClick={() => { setFormLink(""); setLinkMode("none"); setLinkDropdownOpen(false); }}
                          className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent transition-colors text-muted-foreground"
                        >
                          Sem link
                        </button>
                        <button
                          type="button"
                          onClick={() => { setLinkMode("custom"); setLinkDropdownOpen(false); }}
                          className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                        >
                          <ExternalLink className="size-3.5" />
                          URL personalizada
                        </button>
                        {filteredOptions.length > 0 && <div className="my-1 border-t" />}
                        {filteredOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setFormLink(option.value);
                              setLinkMode("product");
                              setLinkDropdownOpen(false);
                              setLinkSearch("");
                            }}
                            className={`w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent transition-colors ${
                              formLink === option.value ? "bg-primary/10 text-primary" : ""
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                        {filteredOptions.length === 0 && linkSearch && (
                          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                            Nenhum produto encontrado
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              {linkMode === "custom" && (
                <Input
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  placeholder="https://... ou /pt/produto/..."
                  className="mt-2"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="banner-active"
              checked={formActive}
              onCheckedChange={(v) => setFormActive(!!v)}
            />
            <Label htmlFor="banner-active">Ativo</Label>
          </div>

          <Separator />

          {/* Translations */}
          {formTranslations.map((t, idx) => (
            <div key={t.locale} className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {LOCALE_LABELS[t.locale as keyof typeof LOCALE_LABELS]}
              </Label>
              <Input
                value={t.title}
                onChange={(e) =>
                  setFormTranslations((prev) =>
                    prev.map((tr, i) =>
                      i === idx ? { ...tr, title: e.target.value } : tr
                    )
                  )
                }
                placeholder="Título (opcional)"
              />
              <Input
                value={t.subtitle}
                onChange={(e) =>
                  setFormTranslations((prev) =>
                    prev.map((tr, i) =>
                      i === idx ? { ...tr, subtitle: e.target.value } : tr
                    )
                  )
                }
                placeholder="Subtítulo (opcional)"
              />
            </div>
          ))}

        </CardContent>
      </Card>

      <BannerCropper
        imageUrl={cropperImageUrl}
        open={cropperOpen}
        onComplete={handleCropComplete}
        onCancel={handleCropCancel}
        folder="banners"
      />
    </div>
  );
}
