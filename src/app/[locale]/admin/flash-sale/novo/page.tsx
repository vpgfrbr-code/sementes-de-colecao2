"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Boxes,
  ChevronDown,
  FolderTree,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  useAdminSaveRegistration,
  useDirtySnapshot,
} from "../../_components/admin-save-context";

const LOCALES = ["pt", "en", "es"] as const;
const LOCALE_LABELS: Record<string, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
};

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  active: boolean;
}

interface Category {
  id: string;
  slug: string;
  category_translations: { locale: string; name: string }[];
}

interface Product {
  id: string;
  slug: string;
  images: string[];
  product_translations: { locale: string; name: string }[];
}

interface FlashSaleItem {
  type: "product" | "category";
  product_id?: string;
  category_id?: string;
  label: string;
  slug: string;
  image?: string;
}

const EMPTY_TRANSLATIONS = LOCALES.map((locale) => ({
  locale,
  title: "",
  subtitle: "",
  button_text: "",
}));

const EMPTY_FORM = {
  active: true,
  coupon_id: "",
  discount_type: "percentage" as "percentage" | "fixed",
  discount_value: 0,
  ends_at: "",
  translations: EMPTY_TRANSLATIONS,
  items: [] as FlashSaleItem[],
};

export default function NewFlashSalePage() {
  const locale = useLocale();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const { isDirty } = useDirtySnapshot(form);

  // Data for pickers
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/coupons")
      .then((r) => r.json())
      .then((data) => setCoupons(data.filter((c: Coupon) => c.active)))
      .catch(() => {});

    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products");
      if (res.ok) setAllProducts(await res.json());
    } catch {
      toast.error("Não foi possível carregar os produtos.");
    }
  }, []);

  useAdminSaveRegistration({
    label: "Salvar",
    canSave: Boolean(form.ends_at && form.translations.some((t) => t.title)),
    saving,
    dirty: isDirty,
    onSave: handleSave,
  });

  function updateTranslation(localeKey: string, field: string, value: string) {
    setForm((f) => ({
      ...f,
      translations: f.translations.map((t) =>
        t.locale === localeKey ? { ...t, [field]: value } : t
      ),
    }));
  }

  function addCategoryItem(cat: Category) {
    if (form.items.some((i) => i.category_id === cat.id)) return;
    const name =
      cat.category_translations.find((t) => t.locale === locale)?.name ??
      cat.category_translations[0]?.name ??
      cat.slug;
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        { type: "category", category_id: cat.id, label: name, slug: cat.slug },
      ],
    }));
  }

  function addProductItem(product: Product) {
    if (form.items.some((i) => i.product_id === product.id)) return;
    const name =
      product.product_translations.find((t) => t.locale === locale)?.name ??
      product.product_translations[0]?.name ??
      product.slug;
    const thumb = product.images.find(
      (img) => !/\.(mp4|webm|mov)($|\?)/i.test(img)
    );
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          type: "product",
          product_id: product.id,
          label: name,
          slug: product.slug,
          image: thumb,
        },
      ],
    }));
    setProductDialogOpen(false);
  }

  function removeItem(index: number) {
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        active: form.active,
        coupon_id: form.coupon_id || null,
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        translations: form.translations.filter((t) => t.title),
        items: form.items.map((item) => ({
          product_id: item.product_id ?? null,
          category_id: item.category_id ?? null,
        })),
      };
      const res = await fetch("/api/admin/flash-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Flash sale criada");
        router.push(`/${locale}/admin/flash-sale`);
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Falha ao criar a flash sale.");
      }
    } catch {
      toast.error("Falha ao criar a flash sale.");
    } finally {
      setSaving(false);
    }
  }

  // Filter products not already added
  const addedProductIds = new Set(form.items.filter((i) => i.product_id).map((i) => i.product_id));
  const filteredProducts = allProducts.filter(
    (p) =>
      !addedProductIds.has(p.id) &&
      (p.product_translations.some((t) =>
        t.name.toLowerCase().includes(productSearch.toLowerCase())
      ) ||
        p.slug.toLowerCase().includes(productSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/admin/flash-sale`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nova Flash Sale</h1>
      </div>

      <Card>
        <CardContent className="space-y-6 p-4 sm:p-6">
          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="fs-active"
              checked={form.active}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, active: !!checked }))
              }
            />
            <Label htmlFor="fs-active">Ativa</Label>
          </div>

          {/* Translations */}
          <Separator />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Textos por Idioma
          </p>

          {LOCALES.map((loc) => {
            const t = form.translations.find((t) => t.locale === loc)!;
            return (
              <Collapsible key={loc} defaultOpen={loc === "pt"}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary">
                  {LOCALE_LABELS[loc]}
                  <ChevronDown className="size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 px-1 pt-3">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input
                      value={t.title}
                      onChange={(e) =>
                        updateTranslation(loc, "title", e.target.value)
                      }
                      placeholder={loc === "pt" ? "Flash Sale 420! 20% OFF!" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtítulo</Label>
                    <Input
                      value={t.subtitle}
                      onChange={(e) =>
                        updateTranslation(loc, "subtitle", e.target.value)
                      }
                      placeholder={loc === "pt" ? "Celebre o 420 com desconto exclusivo..." : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto do Botão</Label>
                    <Input
                      value={t.button_text}
                      onChange={(e) =>
                        updateTranslation(loc, "button_text", e.target.value)
                      }
                      placeholder={loc === "pt" ? "Ver sementes em promoção" : ""}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {/* Discount */}
          <Separator />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Desconto nos Produtos
          </p>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de Desconto</Label>
              <Select
                value={form.discount_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, discount_type: v as "percentage" | "fixed" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentagem</SelectItem>
                  <SelectItem value="fixed">Valor Fixo (centavos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Valor {form.discount_type === "percentage" ? "(%)" : "(centavos USD)"}
              </Label>
              <Input
                type="number"
                value={form.discount_value}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    discount_value: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>

          {/* Coupon */}
          <Separator />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cupom Vinculado (opcional)
          </p>

          <div className="space-y-2">
            <Label>Cupom</Label>
            <Select
              value={form.coupon_id}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, coupon_id: v === "__none__" ? "" : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhum cupom" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {coupons.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="font-mono">{c.code}</span>
                    <span className="ml-2 text-muted-foreground">
                      ({c.type === "percentage" ? `${c.value}%` : `$${(c.value / 100).toFixed(2)}`})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label>Data de Término</Label>
            <Input
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) =>
                setForm((f) => ({ ...f, ends_at: e.target.value }))
              }
            />
          </div>

          {/* Items */}
          <Separator />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Itens Participantes
          </p>

          <div className="flex flex-wrap gap-2">
            {/* Add Category */}
            <Select
              onValueChange={(catId) => {
                const cat = categories.find((c) => c.id === catId);
                if (cat) addCategoryItem(cat);
              }}
            >
              <SelectTrigger className="w-auto gap-2">
                <FolderTree className="size-4" />
                <SelectValue placeholder="Adicionar categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => {
                  const name =
                    cat.category_translations.find((t) => t.locale === locale)?.name ??
                    cat.category_translations[0]?.name ??
                    cat.slug;
                  return (
                    <SelectItem key={cat.id} value={cat.id}>
                      {name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Add Product */}
            <Dialog
              open={productDialogOpen}
              onOpenChange={(open) => {
                setProductDialogOpen(open);
                if (open) fetchProducts();
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Boxes className="mr-1 size-4" />
                  Adicionar produto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Adicionar Produto</DialogTitle>
                  <DialogDescription>
                    Selecione um produto para incluir nesta flash sale.
                  </DialogDescription>
                </DialogHeader>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="mt-2 max-h-[50vh] overflow-y-auto space-y-2 pr-1">
                  {filteredProducts.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum produto encontrado
                    </p>
                  ) : (
                    filteredProducts.map((p) => {
                      const name =
                        p.product_translations.find((t) => t.locale === locale)?.name ??
                        p.product_translations[0]?.name ??
                        p.slug;
                      const thumb = p.images.find(
                        (img) => !/\.(mp4|webm|mov)($|\?)/i.test(img)
                      );
                      return (
                        <button
                          key={p.id}
                          onClick={() => addProductItem(p)}
                          className="flex w-full items-center gap-3 rounded-md border p-2 text-left transition-colors hover:bg-secondary"
                        >
                          <div className="relative size-10 shrink-0 overflow-hidden rounded bg-secondary">
                            {thumb ? (
                              <Image
                                src={thumb}
                                alt={name}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Boxes className="size-4 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{name}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.slug}</p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Items list */}
          {form.items.length > 0 && (
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div
                  key={`${item.type}-${item.product_id ?? item.category_id}`}
                  className="flex items-center gap-3 rounded-md border bg-card p-3"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded bg-secondary">
                    {item.type === "category" ? (
                      <FolderTree className="size-4 text-muted-foreground" />
                    ) : item.image ? (
                      <Image
                        src={item.image}
                        alt={item.label}
                        width={32}
                        height={32}
                        className="rounded object-cover"
                      />
                    ) : (
                      <Boxes className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.type === "category" ? "Categoria" : "Produto"} · {item.slug}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(idx)}
                  >
                    <X className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
