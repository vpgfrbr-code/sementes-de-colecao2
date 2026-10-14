"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { ArrowLeft, Plus, Trash2, X, Star, Percent, ChevronDown, ChevronUp, Video, ImageIcon, Package } from "lucide-react";
import { toast } from "sonner";
import { FLAVOR_SLUGS, FLAVOR_LABELS, FlavorIcon } from "@/components/product/flavor-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MediaManager } from "@/components/admin/media-manager";
import { DescriptionsEditor, type DescriptionLocale } from "@/components/admin/descriptions-editor";
import Link from "next/link";
import {
  useAdminSaveRegistration,
  useDirtySnapshot,
} from "../../_components/admin-save-context";
import { DetailSkeleton } from "../../_components/ui/admin-skeletons";
import { SectionAnchorNav } from "../../_components/ui/section-anchor-nav";

const LOCALES: readonly DescriptionLocale[] = ["pt", "en", "es"] as const;

interface Category {
  id: string;
  slug: string;
  category_translations: { locale: string; name: string }[];
}

interface Terpene {
  id: string;
  slug: string;
  name: string;
  aroma: string;
  color: string;
}

interface SeedBank {
  id: string;
  slug: string;
  seed_bank_translations: { locale: string; name: string }[];
}

interface ProductTerpene {
  terpene_id: string;
  is_dominant: boolean;
}

interface BundleComponent {
  component_product_id: string;
  seed_count: number;
  productName: string;
}

interface SimpleProduct {
  id: string;
  slug: string;
  stock: number;
  product_translations: { locale: string; name: string }[];
}

interface Variant {
  id?: string;
  slug: string;
  seed_count: number;
  price_cents: number;
  stock: number;
  active: boolean;
  on_sale: boolean;
  discount_type: string;
  discount_value: number;
  sale_ends_at: string;
}

interface Translation {
  locale: string;
  name: string;
  description: string;
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const locale = useLocale();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTerpenes, setAllTerpenes] = useState<Terpene[]>([]);
  const [seedBanks, setSeedBanks] = useState<SeedBank[]>([]);
  const [allProducts, setAllProducts] = useState<SimpleProduct[]>([]);
  const [bundleComponents, setBundleComponents] = useState<BundleComponent[]>([]);
  const [newCompProductId, setNewCompProductId] = useState("");
  const [newCompSeedCount, setNewCompSeedCount] = useState(5);

  const [form, setForm] = useState({
    slug: "",
    product_type: "standard" as string,
    specimen_code: "" as string,
    price_cents: 0,
    shipping_cents: 0,
    stock: 0,
    active: true,
    category_id: "",
    seed_type: "" as string,
    seed_bank_id: "" as string,
    flowering_weeks_min: "" as string | number,
    flowering_weeks_max: "" as string | number,
    thc_max: "" as string | number,
    cbd_max: "" as string | number,
    genetics: "",
    parent_mother: "",
    parent_father: "",
    show_real_photos: false,
    is_featured: false,
    hero_video_url: "" as string,
    hero_poster_url: "" as string,
    hero_frame_count: 0 as number,
    on_sale: false,
    discount_type: "percentage" as string,
    discount_value: 0,
    sale_ends_at: "",
    variant_discounts_enabled: false,
  });

  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [realPhotos, setRealPhotos] = useState<string[]>([]);

  const [productName, setProductName] = useState("");
  const [descriptions, setDescriptions] = useState<Record<DescriptionLocale, string>>({
    pt: "",
    en: "",
    es: "",
  });

  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedTerpenes, setSelectedTerpenes] = useState<ProductTerpene[]>([]);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const { isDirty } = useDirtySnapshot(
    {
      form,
      mediaUrls,
      realPhotos,
      productName,
      descriptions,
      variants,
      selectedTerpenes,
      selectedFlavors,
      bundleComponents,
    },
    !loading
  );

  const trimmedName = productName.trim();
  const canSaveProduct =
    trimmedName.length >= 2 && Boolean(form.slug.trim()) && form.price_cents > 0;

  useAdminSaveRegistration({
    label: "Salvar Alterações",
    canSave: canSaveProduct,
    saving,
    dirty: isDirty,
    onSave: handleSave,
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/categories")
        .then((r) => r.ok ? r.json() : [])
        .then(setCategories),
      fetch("/api/admin/terpenes")
        .then((r) => r.ok ? r.json() : [])
        .then(setAllTerpenes),
      fetch("/api/admin/seed-banks")
        .then((r) => r.ok ? r.json() : [])
        .then(setSeedBanks),
      fetch("/api/admin/products")
        .then((r) => r.ok ? r.json() : [])
        .then((data: SimpleProduct[]) => setAllProducts(data ?? [])),
      fetch(`/api/admin/products/${id}`)
        .then(async (r) => {
          if (!r.ok) {
            let detail = `HTTP ${r.status}`;
            try {
              const j = await r.json();
              if (j?.error) detail = j.error;
            } catch {
              // ignore
            }
            throw new Error(detail);
          }
          return r.json();
        })
        .then((product) => {
          setForm({
            slug: product.slug,
            product_type: product.product_type ?? "standard",
            specimen_code: product.specimen_code ?? "",
            price_cents: product.price_cents,
            shipping_cents: product.shipping_cents ?? 0,
            stock: product.stock,
            active: product.active,
            category_id: product.category_id ?? "",
            seed_type: product.seed_type ?? "",
            seed_bank_id: product.seed_bank_id ?? "",
            flowering_weeks_min: product.flowering_weeks_min ?? "",
            flowering_weeks_max: product.flowering_weeks_max ?? "",
            thc_max: product.thc_max ?? "",
            cbd_max: product.cbd_max ?? "",
            genetics: product.genetics ?? "",
            parent_mother: product.parent_mother ?? "",
            parent_father: product.parent_father ?? "",
            show_real_photos: product.show_real_photos ?? false,
            is_featured: product.is_featured ?? false,
            hero_video_url: product.hero_video_url ?? "",
            hero_poster_url: product.hero_poster_url ?? "",
            hero_frame_count: product.hero_frame_count ?? 0,
            on_sale: product.on_sale ?? false,
            discount_type: product.discount_type ?? "percentage",
            discount_value: product.discount_value ?? 0,
            sale_ends_at: product.sale_ends_at ? product.sale_ends_at.slice(0, 16) : "",
            variant_discounts_enabled: product.variant_discounts_enabled ?? false,
          });
          setMediaUrls(product.images as string[] ?? []);
          setRealPhotos(product.real_photos as string[] ?? []);
          const rows: Translation[] = product.product_translations ?? [];
          const ptRow = rows.find((t) => t.locale === "pt");
          const fallbackName =
            ptRow?.name ??
            rows.find((t) => t.name?.trim())?.name ??
            "";
          setProductName(fallbackName);
          setDescriptions({
            pt: rows.find((t) => t.locale === "pt")?.description ?? "",
            en: rows.find((t) => t.locale === "en")?.description ?? "",
            es: rows.find((t) => t.locale === "es")?.description ?? "",
          });
          setVariants(
            (product.product_variants ?? []).map((v: Variant & { id: string }) => ({
              id: v.id,
              slug: v.slug,
              seed_count: v.seed_count,
              price_cents: v.price_cents,
              stock: v.stock,
              active: v.active,
              on_sale: v.on_sale ?? false,
              discount_type: v.discount_type ?? "percentage",
              discount_value: v.discount_value ?? 0,
              sale_ends_at: v.sale_ends_at ? String(v.sale_ends_at).slice(0, 16) : "",
            }))
          );
          setSelectedTerpenes(
            (product.product_terpenes ?? []).map((pt: { terpene_id: string; is_dominant: boolean }) => ({
              terpene_id: pt.terpene_id,
              is_dominant: pt.is_dominant ?? false,
            }))
          );
          setSelectedFlavors(product.flavors ?? []);
          // Load bundle components if applicable
          if (product.product_type === "bundle" && product.bundle_components?.length) {
            setBundleComponents(
              product.bundle_components.map((c: { component_product_id: string; seed_count: number; products: { id: string; slug: string; product_translations: { locale: string; name: string }[] } | null }) => ({
                component_product_id: c.component_product_id,
                seed_count: c.seed_count,
                productName:
                  c.products?.product_translations?.find((t: { locale: string; name: string }) => t.locale === "pt")?.name ??
                  c.products?.slug ??
                  c.component_product_id,
              }))
            );
          }
        }),
    ])
      .catch((err) => {
        console.error("[admin/produtos/edit] load failed:", err);
        toast.error(
          err instanceof Error
            ? `Falha ao carregar produto: ${err.message}`
            : "Falha ao carregar produto."
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  function updateVariant(idx: number, field: keyof Variant, value: unknown) {
    setVariants((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v))
    );
  }

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      { slug: "", seed_count: 1, price_cents: 0, stock: 0, active: true, on_sale: false, discount_type: "percentage", discount_value: 0, sale_ends_at: "" },
    ]);
  }

  function removeVariant(idx: number) {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    const name = productName.trim();
    if (name.length < 2) {
      toast.error("Informe o nome do produto.");
      return;
    }
    if (!form.slug.trim()) {
      toast.error("Informe um slug para o produto.");
      return;
    }
    if (form.price_cents <= 0) {
      toast.error("Informe um preço maior que zero.");
      return;
    }
    if (form.product_type === "bundle" && bundleComponents.length === 0) {
      toast.error("Adicione ao menos um produto componente ao bundle.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: form.slug,
          product_type: form.product_type,
          specimen_code: form.specimen_code.trim() || null,
          price_cents: form.price_cents,
          shipping_cents: form.shipping_cents,
          stock: form.product_type === "bundle" ? 0 : form.stock,
          images: mediaUrls,
          active: form.active,
          category_id: form.category_id || null,
          seed_bank_id: form.seed_bank_id || null,
          seed_type: form.product_type === "bundle" ? null : (form.seed_type || null),
          flowering_weeks_min: form.product_type === "bundle" ? null : (form.flowering_weeks_min === "" ? null : Number(form.flowering_weeks_min)),
          flowering_weeks_max: form.product_type === "bundle" ? null : (form.flowering_weeks_max === "" ? null : Number(form.flowering_weeks_max)),
          thc_max: form.product_type === "bundle" ? null : (form.thc_max === "" ? null : Number(form.thc_max)),
          cbd_max: form.product_type === "bundle" ? null : (form.cbd_max === "" ? null : Number(form.cbd_max)),
          genetics: form.product_type === "bundle" ? null : (form.genetics || null),
          parent_mother: form.product_type === "bundle" ? null : (form.parent_mother || null),
          parent_father: form.product_type === "bundle" ? null : (form.parent_father || null),
          real_photos: realPhotos.length > 0 ? realPhotos : null,
          show_real_photos: form.show_real_photos,
          is_featured: form.is_featured,
          hero_video_url: form.is_featured && form.hero_video_url ? form.hero_video_url : null,
          hero_poster_url: form.is_featured && form.hero_poster_url ? form.hero_poster_url : null,
          hero_frame_count: form.is_featured && form.hero_frame_count > 0 ? form.hero_frame_count : null,
          on_sale: form.on_sale,
          discount_type: form.on_sale ? form.discount_type : null,
          discount_value: form.on_sale ? form.discount_value : 0,
          sale_ends_at: form.on_sale && form.sale_ends_at ? new Date(form.sale_ends_at).toISOString() : null,
          variant_discounts_enabled: form.variant_discounts_enabled,
          translations: LOCALES.map((l) => ({
            locale: l,
            name,
            description: descriptions[l]?.trim() ?? "",
          })),
          variants: variants.filter((v) => v.slug.trim()).map((v) => {
            // Stock is unified at the product level (products.stock); variant stock is legacy.
            const { stock: _stock, ...rest } = v;
            void _stock;
            return {
              ...rest,
              seed_count: form.product_type === "bundle" ? 0 : v.seed_count,
              on_sale: form.variant_discounts_enabled ? v.on_sale : false,
              discount_type: form.variant_discounts_enabled && v.on_sale ? v.discount_type : null,
              discount_value: form.variant_discounts_enabled && v.on_sale ? v.discount_value : 0,
              sale_ends_at: form.variant_discounts_enabled && v.on_sale && v.sale_ends_at ? new Date(v.sale_ends_at).toISOString() : null,
            };
          }),
          terpene_ids: form.product_type === "bundle" ? [] : selectedTerpenes,
          flavors: selectedFlavors,
          bundle_components: form.product_type === "bundle"
            ? bundleComponents.map((c) => ({ component_product_id: c.component_product_id, seed_count: c.seed_count }))
            : [],
        }),
      });

      if (res.ok) {
        toast.success("Alterações salvas.");
        router.push(`/${locale}/admin/produtos`);
        return;
      }
      let message = `Erro ao salvar (${res.status}).`;
      try {
        const data = await res.json();
        if (data?.error) message = data.error;
      } catch {
        // ignore parse error
      }
      toast.error(message);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro de rede ao salvar produto.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  const anchorSections = [
    { id: "sec-basico", label: "Básico" },
    { id: "sec-descricoes", label: "Descrições" },
    ...(form.product_type === "bundle"
      ? [{ id: "sec-bundle", label: "Bundle" }]
      : [{ id: "sec-cepa", label: "Cepa & Terpenos" }]),
    ...(form.product_type !== "bundle"
      ? [{ id: "sec-fotos", label: "Fotos Reais" }]
      : []),
    { id: "sec-variantes", label: "Variantes" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="size-11 p-0 md:size-9">
          <Link href={`/${locale}/admin/produtos`} aria-label="Voltar para produtos">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Editar Produto</h1>
      </div>

      <SectionAnchorNav sections={anchorSections} />

      <div id="sec-basico" className="grid scroll-mt-32 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">Nome do produto</Label>
              <Input
                id="product-name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex.: Maracujá, Forbidden Orange, Thailand Expedition…"
              />
              <p className="text-muted-foreground text-xs">
                Nome global — igual em todos os idiomas.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Produto</Label>
              <Select
                value={form.product_type}
                onValueChange={(v) => setForm((f) => ({ ...f, product_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Produto Padrão</SelectItem>
                  <SelectItem value="bundle">Bundle Pack</SelectItem>
                </SelectContent>
              </Select>
              {form.product_type === "bundle" && (
                <p className="text-muted-foreground text-xs flex items-start gap-1.5">
                  <Package className="size-3.5 shrink-0 mt-0.5" />
                  <span>Bundle agrupa outros produtos. O estoque, genética, terpenos e floração vêm dos componentes.</span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Código da ficha (No. …)</Label>
              <Input
                value={form.specimen_code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, specimen_code: e.target.value }))
                }
                placeholder="Vazio = iniciais do nome (automático)"
              />
              <p className="text-muted-foreground text-xs">
                Opcional. No site, vazio gera o código a partir das iniciais do nome da semente (por idioma);
                só preencha para forçar um código fixo (ex. campanha ou lote).
              </p>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Preço (USD)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.price_cents ? (form.price_cents / 100).toFixed(2) : ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, "");
                    setForm((f) => ({
                      ...f,
                      price_cents: Math.round(parseFloat(val || "0") * 100),
                    }));
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Frete fixo (USD)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.shipping_cents ? (form.shipping_cents / 100).toFixed(2) : ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, "");
                    setForm((f) => ({
                      ...f,
                      shipping_cents: Math.round(parseFloat(val || "0") * 100),
                    }));
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>
            {form.product_type !== "bundle" && (
              <div className="space-y-2">
                <Label>Estoque Total (sementes)</Label>
                <Input
                  type="number"
                  value={form.stock}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      stock: parseInt(e.target.value) || 0,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">Total de sementes individuais em estoque</p>
              </div>
            )}
            <MediaManager value={mediaUrls} onChange={setMediaUrls} folder="products" />
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.category_translations.find((t) => t.locale === "pt")
                        ?.name ?? cat.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Seed Bank</Label>
              <Select
                value={form.seed_bank_id}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, seed_bank_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {seedBanks.map((sb) => (
                    <SelectItem key={sb.id} value={sb.id}>
                      {sb.seed_bank_translations.find((t) => t.locale === "pt")
                        ?.name ?? sb.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="product-active-edit"
                checked={form.active}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, active: !!checked }))
                }
              />
              <Label htmlFor="product-active-edit">Ativo</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="size-4" />
              Destaque & Promoção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <Label htmlFor="is-featured" className="flex items-center gap-2 cursor-pointer">
                <Star className="size-4 text-amber-500" />
                Produto em Destaque
              </Label>
              <Switch
                id="is-featured"
                checked={form.is_featured}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, is_featured: checked }))
                }
              />
            </div>

            {form.is_featured && (
              <div className="space-y-4 rounded-md border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs text-muted-foreground">
                  Configure os frames do hero para exibir uma landing page premium com scroll animado. Extraia frames do vídeo com ffmpeg e informe o prefixo do caminho e a quantidade.
                </p>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs">
                    <Video className="size-3.5" />
                    Prefixo dos frames (ex: /images/maracuruja/frames/frame_)
                  </Label>
                  <Input
                    value={form.hero_video_url}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, hero_video_url: e.target.value }))
                    }
                    placeholder="/images/produto/frames/frame_"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs">
                    <Video className="size-3.5" />
                    Quantidade de frames
                  </Label>
                  <Input
                    type="number"
                    value={form.hero_frame_count || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, hero_frame_count: parseInt(e.target.value) || 0 }))
                    }
                    placeholder="97"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs">
                    <ImageIcon className="size-3.5" />
                    Imagem Poster (loading)
                  </Label>
                  <MediaManager
                    value={form.hero_poster_url ? [form.hero_poster_url] : []}
                    onChange={(urls) =>
                      setForm((f) => ({ ...f, hero_poster_url: urls[0] ?? "" }))
                    }
                    folder="hero_videos"
                  />
                </div>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <Label htmlFor="on-sale" className="flex items-center gap-2 cursor-pointer">
                <Percent className="size-4 text-red-500" />
                Em Promoção
              </Label>
              <Switch
                id="on-sale"
                checked={form.on_sale}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, on_sale: checked }))
                }
              />
            </div>

            {form.on_sale && (
              <div className="space-y-4 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="variant-discounts" className="text-sm cursor-pointer">
                    Desconto individual por variante
                  </Label>
                  <Switch
                    id="variant-discounts"
                    checked={form.variant_discounts_enabled}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, variant_discounts_enabled: checked }))
                    }
                  />
                </div>

                {form.variant_discounts_enabled ? (
                  <p className="text-xs text-muted-foreground">
                    Configure o desconto em cada variante na seção de variantes abaixo.
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs">Tipo de Desconto</Label>
                      <RadioGroup
                        value={form.discount_type}
                        onValueChange={(v) =>
                          setForm((f) => ({ ...f, discount_type: v }))
                        }
                        className="flex gap-4"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="percentage" id="discount-pct" />
                          <Label htmlFor="discount-pct" className="text-sm cursor-pointer">Percentual (%)</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="fixed" id="discount-fixed" />
                          <Label htmlFor="discount-fixed" className="text-sm cursor-pointer">Valor fixo (USD)</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">
                        {form.discount_type === "percentage" ? "Desconto (%)" : "Desconto (USD)"}
                      </Label>
                      <Input
                        type="number"
                        step={form.discount_type === "percentage" ? "1" : "0.01"}
                        min="0"
                        max={form.discount_type === "percentage" ? "100" : undefined}
                        value={form.discount_type === "percentage" ? form.discount_value : form.discount_value ? (form.discount_value / 100).toFixed(2) : ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setForm((f) => ({
                            ...f,
                            discount_value: f.discount_type === "percentage" ? val : Math.round(val * 100),
                          }));
                        }}
                        placeholder={form.discount_type === "percentage" ? "20" : "10.00"}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Desconto aplicado igualmente em todas as variantes.
                    </p>
                  </>
                )}

                <div className="space-y-2">
                  <Label className="text-xs">Fim da Campanha</Label>
                  <Input
                    type="datetime-local"
                    value={form.sale_ends_at}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sale_ends_at: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe vazio para promoção sem data de término.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div id="sec-descricoes" className="grid scroll-mt-32 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Descrições</CardTitle>
          </CardHeader>
          <CardContent>
            <DescriptionsEditor
              value={descriptions}
              onChange={setDescriptions}
              idPrefix="edit-desc"
            />
          </CardContent>
        </Card>
      </div>

      {/* Bundle Components */}
      {form.product_type === "bundle" && (
        <Card id="sec-bundle" className="scroll-mt-32 border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-4 text-primary" />
              Componentes do Bundle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p>
                Selecione os produtos que fazem parte deste bundle e a quantidade de sementes de cada um por unidade vendida.
              </p>
              <p>
                O <strong>estoque efetivo</strong> é calculado automaticamente: ao comprar 1 bundle, as sementes são deduzidas dos produtos componentes.
              </p>
            </div>

            {bundleComponents.length > 0 && (() => {
              const effective = Math.min(
                ...bundleComponents.map((c) => {
                  const p = allProducts.find((x) => x.id === c.component_product_id);
                  return p && c.seed_count > 0 ? Math.floor(p.stock / c.seed_count) : 0;
                })
              );
              return (
                <div className="rounded-md border bg-primary/5 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Estoque efetivo do bundle</p>
                    <p className="text-2xl font-mono font-semibold">
                      {Number.isFinite(effective) ? effective : 0}
                      <span className="text-sm text-muted-foreground font-normal ml-1">unidades</span>
                    </p>
                  </div>
                  <Package className="size-8 text-primary/30" />
                </div>
              );
            })()}

            {bundleComponents.length > 0 && (
              <div className="divide-y rounded-md border">
                {bundleComponents.map((comp, idx) => {
                  const p = allProducts.find((x) => x.id === comp.component_product_id);
                  const compStock = p?.stock ?? 0;
                  const possible = comp.seed_count > 0 ? Math.floor(compStock / comp.seed_count) : 0;
                  return (
                    <div key={comp.component_product_id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{comp.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {comp.seed_count} sementes/un · estoque: {compStock} → rende {possible} bundles
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBundleComponents((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {bundleComponents.length === 0 && (
              <p className="text-sm text-muted-foreground italic">Nenhum componente adicionado.</p>
            )}

            <div className="flex gap-2 flex-wrap items-end">
              <div className="flex-1 min-w-[200px] space-y-1">
                <Label className="text-xs">Produto</Label>
                <Select value={newCompProductId} onValueChange={setNewCompProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allProducts
                      .filter((p) => p.id !== id && !bundleComponents.some((c) => c.component_product_id === p.id))
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.product_translations.find((t) => t.locale === "pt")?.name ?? p.slug}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sementes</Label>
                <Input
                  type="number"
                  min="1"
                  value={newCompSeedCount}
                  onChange={(e) => setNewCompSeedCount(parseInt(e.target.value) || 1)}
                  className="w-24"
                />
              </div>
              <Button
                variant="outline"
                disabled={!newCompProductId}
                onClick={() => {
                  const p = allProducts.find((x) => x.id === newCompProductId);
                  if (!p) return;
                  setBundleComponents((prev) => [
                    ...prev,
                    {
                      component_product_id: p.id,
                      seed_count: newCompSeedCount,
                      productName: p.product_translations.find((t) => t.locale === "pt")?.name ?? p.slug,
                    },
                  ]);
                  setNewCompProductId("");
                  setNewCompSeedCount(5);
                }}
              >
                <Plus className="size-4" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {form.product_type !== "bundle" && (
      <div id="sec-cepa" className="grid scroll-mt-32 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações da Cepa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de Semente</Label>
                <Select
                  value={form.seed_type}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, seed_type: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feminized">Feminizada</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="autoflower">Automática</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Genética</Label>
                <Input
                  value={form.genetics}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, genetics: e.target.value }))
                  }
                  placeholder="Purple Punch x Gelato"
                />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Mãe (Parent Mother)</Label>
                <Input
                  value={form.parent_mother}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, parent_mother: e.target.value }))
                  }
                  placeholder="Purple Punch"
                />
              </div>
              <div className="space-y-2">
                <Label>Pai (Parent Father)</Label>
                <Input
                  value={form.parent_father}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, parent_father: e.target.value }))
                  }
                  placeholder="Gelato"
                />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Floração (semanas min)</Label>
                <Input
                  type="number"
                  value={form.flowering_weeks_min}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      flowering_weeks_min: e.target.value === "" ? "" : parseInt(e.target.value) || "",
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Floração (semanas max)</Label>
                <Input
                  type="number"
                  value={form.flowering_weeks_max}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      flowering_weeks_max: e.target.value === "" ? "" : parseInt(e.target.value) || "",
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>THC max %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.thc_max}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      thc_max: e.target.value === "" ? "" : parseFloat(e.target.value) || "",
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>CBD max %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.cbd_max}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      cbd_max: e.target.value === "" ? "" : parseFloat(e.target.value) || "",
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Terpenos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Adicionar Terpeno</Label>
              <Select
                value=""
                onValueChange={(terpeneId) => {
                  if (!selectedTerpenes.find((t) => t.terpene_id === terpeneId)) {
                    setSelectedTerpenes((prev) => [
                      ...prev,
                      { terpene_id: terpeneId, is_dominant: false },
                    ]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar terpeno..." />
                </SelectTrigger>
                <SelectContent>
                  {allTerpenes
                    .filter((t) => !selectedTerpenes.find((s) => s.terpene_id === t.id))
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} — {t.aroma}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedTerpenes.map((st) => {
                const terp = allTerpenes.find((t) => t.id === st.terpene_id);
                if (!terp) return null;
                return (
                  <div key={st.terpene_id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                    <span
                      className="size-3 rounded-full shrink-0"
                      style={{ backgroundColor: terp.color }}
                    />
                    <span className="text-sm font-medium">{terp.name}</span>
                    <button
                      type="button"
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        st.is_dominant
                          ? "bg-primary text-primary-foreground border-primary"
                          : "text-muted-foreground hover:border-primary"
                      }`}
                      onClick={() =>
                        setSelectedTerpenes((prev) =>
                          prev.map((s) => ({
                            ...s,
                            is_dominant: s.terpene_id === st.terpene_id ? !s.is_dominant : false,
                          }))
                        )
                      }
                    >
                      Dominante
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTerpenes((prev) =>
                          prev.filter((s) => s.terpene_id !== st.terpene_id)
                        )
                      }
                    >
                      <X className="size-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                );
              })}
              {selectedTerpenes.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum terpeno selecionado</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Flavors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sabores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Adicionar Sabor</Label>
              <Select
                value=""
                onValueChange={(slug) => {
                  if (!selectedFlavors.includes(slug)) {
                    setSelectedFlavors((prev) => [...prev, slug]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar sabor..." />
                </SelectTrigger>
                <SelectContent>
                  {FLAVOR_SLUGS
                    .filter((s) => !selectedFlavors.includes(s))
                    .map((s) => (
                      <SelectItem key={s} value={s}>
                        {FLAVOR_LABELS[s]}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedFlavors.map((slug) => (
                <div key={slug} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <FlavorIcon slug={slug} className="h-4 w-4 text-foreground/70" />
                  <span className="text-sm font-medium">{FLAVOR_LABELS[slug as keyof typeof FLAVOR_LABELS]}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedFlavors((prev) => prev.filter((s) => s !== slug))
                    }
                  >
                    <X className="size-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
              {selectedFlavors.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum sabor selecionado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Real Photos */}
      {form.product_type !== "bundle" && (
      <Card id="sec-fotos" className="scroll-mt-32">
        <CardHeader>
          <CardTitle className="text-base">Fotos Reais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-real-photos-edit"
              checked={form.show_real_photos}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, show_real_photos: !!checked }))
              }
            />
            <Label htmlFor="show-real-photos-edit">Exibir seção de fotos reais na página do produto</Label>
          </div>
          <MediaManager value={realPhotos} onChange={setRealPhotos} folder="products/real-photos" />
        </CardContent>
      </Card>
      )}

      <Card id="sec-variantes" className="scroll-mt-32">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {form.product_type === "bundle" ? "Variante do Bundle" : "Variantes"}
          </CardTitle>
          {form.product_type !== "bundle" && (
            <Button variant="outline" size="sm" onClick={addVariant}>
              <Plus className="mr-1 size-4" />
              Adicionar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {form.product_type === "bundle" && (
            <p className="text-xs text-muted-foreground mb-3">
              Bundle tem uma única variante. As sementes são consumidas dos componentes acima.
            </p>
          )}
          {variants.map((v, idx) => (
            <div key={v.id ?? idx} className="mb-4 rounded-md border p-3 space-y-3">
              <div className={`grid gap-2 grid-cols-2 items-end sm:gap-4 ${form.product_type === "bundle" ? "sm:grid-cols-3" : "sm:grid-cols-5"}`}>
              <div className="space-y-1">
                <Label className="text-xs">Slug</Label>
                <Input
                  value={v.slug}
                  onChange={(e) =>
                    updateVariant(idx, "slug", e.target.value)
                  }
                />
              </div>
              {form.product_type !== "bundle" && (
                <div className="space-y-1">
                  <Label className="text-xs">Sementes</Label>
                  <Input
                    type="number"
                    value={v.seed_count}
                    onChange={(e) =>
                      updateVariant(
                        idx,
                        "seed_count",
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Preço (USD)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={v.price_cents ? (v.price_cents / 100).toFixed(2) : ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, "");
                    updateVariant(
                      idx,
                      "price_cents",
                      Math.round(parseFloat(val || "0") * 100)
                    );
                  }}
                  placeholder="0.00"
                />
              </div>
              {form.product_type !== "bundle" && (
                <div className="space-y-1">
                  <Label className="text-xs">Disponível</Label>
                  <p className="text-sm font-mono text-muted-foreground">
                    {v.seed_count > 0 ? Math.floor(form.stock / v.seed_count) : 0} un.
                  </p>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeVariant(idx)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
              </div>

              {form.on_sale && form.variant_discounts_enabled && (
                <div className={`rounded-md p-3 space-y-3 ${v.on_sale ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900" : "bg-muted/50"}`}>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`var-sale-${idx}`} className="text-xs flex items-center gap-1.5 cursor-pointer">
                      <Percent className="size-3 text-red-500" />
                      Promoção desta variante
                    </Label>
                    <Switch
                      id={`var-sale-${idx}`}
                      checked={v.on_sale}
                      onCheckedChange={(checked) =>
                        updateVariant(idx, "on_sale", checked)
                      }
                    />
                  </div>
                  {v.on_sale && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select
                          value={v.discount_type || "percentage"}
                          onValueChange={(val) =>
                            updateVariant(idx, "discount_type", val)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">% Percentual</SelectItem>
                            <SelectItem value="fixed">USD Fixo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {v.discount_type === "fixed" ? "Valor (USD)" : "Valor (%)"}
                        </Label>
                        <Input
                          className="h-8 text-xs"
                          type="number"
                          step={v.discount_type === "fixed" ? "0.01" : "1"}
                          min="0"
                          value={v.discount_type === "fixed" ? (v.discount_value ? (v.discount_value / 100).toFixed(2) : "") : v.discount_value || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateVariant(idx, "discount_value", v.discount_type === "fixed" ? Math.round(val * 100) : val);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Fim</Label>
                        <Input
                          className="h-8 text-xs"
                          type="datetime-local"
                          value={v.sale_ends_at}
                          onChange={(e) =>
                            updateVariant(idx, "sale_ends_at", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href={`/${locale}/admin/produtos`}>
          <Button variant="outline">Cancelar</Button>
        </Link>
      </div>
    </div>
  );
}
