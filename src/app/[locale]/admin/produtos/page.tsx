"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Boxes,
  Edit,
  ExternalLink,
  LayoutGrid,
  List,
  Loader2,
  Minus,
  MoreHorizontal,
  PackageOpen,
  Pencil,
  Percent,
  Plus,
  Search,
  Star,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Check,
  Copy,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/format-price";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/use-debounce";
import { runMutation } from "@/lib/admin-mutation";
import { cn } from "@/lib/utils";
import { AdminEmptyState } from "../_components/ui/admin-empty-state";
import { AdminErrorState } from "../_components/ui/admin-error-state";
import { ListPageSkeleton } from "../_components/ui/admin-skeletons";
import { PullToRefresh } from "../_components/ui/pull-to-refresh";
import { ResponsiveOverlay } from "../_components/ui/responsive-overlay";
import { SwipeableRow } from "../_components/ui/swipeable-row";

type ViewMode = "grid" | "list";

interface Product {
  id: string;
  slug: string;
  price_cents: number;
  stock: number;
  images: string[];
  active: boolean;
  category_id: string | null;
  created_at: string;
  is_featured?: boolean;
  on_sale?: boolean;
  discount_type?: string | null;
  discount_value?: number | null;
  sale_ends_at?: string | null;
  product_translations: { locale: string; name: string; description: string }[];
  product_variants: {
    id: string;
    slug: string;
    seed_count: number;
    price_cents: number;
    shipping_cents: number;
    stock: number;
    active: boolean;
  }[];
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov)($|\?)/i.test(url);
}

export default function AdminProductsPage() {
  const locale = useLocale();
  const t = useTranslations("adminProducts");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [actionsProduct, setActionsProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [editingStockProduct, setEditingStockProduct] = useState<Product | null>(null);
  const [stockDraft, setStockDraft] = useState<number>(0);
  const [savingStock, setSavingStock] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 250);
  const isMobile = useIsMobile();
  const effectiveViewMode: ViewMode = isMobile ? "grid" : viewMode;

  useEffect(() => {
    const saved = localStorage.getItem("admin-products-view");
    if (saved === "list" || saved === "grid") setViewMode(saved);
  }, []);

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem("admin-products-view", mode);
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts(opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) throw new Error("fetch failed");
      setProducts(await res.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(product: Product) {
    const next = !product.active;
    await runMutation({
      url: `/api/admin/products/${product.id}`,
      method: "PUT",
      body: { active: next },
      successMessage: next ? "Produto ativado" : "Produto desativado",
      errorMessage: "Falha ao atualizar o produto.",
      optimistic: () =>
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, active: next } : p))
        ),
      rollback: () =>
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, active: product.active } : p
          )
        ),
    });
  }

  async function duplicateProduct(product: Product) {
    setDuplicatingId(product.id);
    await runMutation({
      url: `/api/admin/products/${product.id}/duplicate`,
      method: "POST",
      successMessage: "Produto duplicado",
      errorMessage: "Falha ao duplicar o produto.",
      onSuccess: () => {
        // Reload list so the new copy shows up
        void fetchProducts({ silent: true });
      },
    });
    setDuplicatingId(null);
  }

  function openStockDialog(product: Product) {
    setStockDraft(Math.max(0, product.stock || 0));
    setEditingStockProduct(product);
  }

  async function saveStock() {
    if (!editingStockProduct) return;
    setSavingStock(true);
    const totalStock = Math.max(0, Math.floor(stockDraft || 0));
    // products.stock is the single source of truth (migration 028).
    // Variants are just packaging options that all debit from this pool.
    const { ok } = await runMutation({
      url: `/api/admin/products/${editingStockProduct.id}`,
      method: "PUT",
      body: { stock: totalStock },
      successMessage: "Estoque atualizado",
      errorMessage: "Erro ao salvar estoque.",
      onSuccess: () =>
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingStockProduct.id ? { ...p, stock: totalStock } : p
          )
        ),
    });
    if (ok) setEditingStockProduct(null);
    setSavingStock(false);
  }

  function getTotalStock(product: Product) {
    return product.stock;
  }

  async function confirmDelete() {
    if (!deletingProduct) return;
    setDeleting(true);
    await runMutation({
      url: `/api/admin/products/${deletingProduct.id}`,
      method: "DELETE",
      successMessage: "Produto excluído",
      errorMessage: "Falha ao excluir o produto.",
      onSuccess: () =>
        setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id)),
    });
    setDeleting(false);
    setDeletingProduct(null);
  }

  const getName = (p: Product) =>
    p.product_translations.find((t) => t.locale === locale)?.name ??
    p.product_translations[0]?.name ??
    p.slug;

  const getThumbnail = (p: Product) => {
    const image = p.images.find((img) => !isVideo(img));
    if (image) return { url: image, type: "image" as const };
    const video = p.images.find((img) => isVideo(img));
    if (video) return { url: video, type: "video" as const };
    return null;
  };

  const filteredProducts = debouncedQuery.trim()
    ? products.filter((p) => {
        const q = debouncedQuery.trim().toLowerCase();
        if (p.slug.toLowerCase().includes(q)) return true;
        return p.product_translations.some((tr) =>
          tr.name?.toLowerCase().includes(q)
        );
      })
    : products;

  if (loading) {
    return <ListPageSkeleton variant="cards" />;
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <AdminErrorState
          message="Não foi possível carregar os produtos."
          onRetry={() => fetchProducts()}
        />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={() => fetchProducts({ silent: true })}>
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("productCount", { count: products.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center rounded-lg border p-0.5 md:flex">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => changeViewMode("grid")}
              title={t("gridView")}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => changeViewMode("list")}
              title={t("listView")}
            >
              <List className="size-4" />
            </Button>
          </div>
          <Link href={`/${locale}/admin/produtos/novo`} className="flex-1 sm:flex-none">
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 size-4" />
              {t("newProduct")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="space-y-1.5">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-11 pl-9 pr-10 md:h-10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Limpar busca"
              className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {debouncedQuery.trim() && (
          <p className="text-xs text-muted-foreground">
            {filteredProducts.length} resultado
            {filteredProducts.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {products.length === 0 ? (
        <AdminEmptyState icon={Boxes} title={t("noProducts")} />
      ) : effectiveViewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const thumb = getThumbnail(product);
            const name = getName(product);
            const card = (
              <Card className="gap-0 overflow-hidden py-0">
                {/* Thumbnail */}
                <div className="relative aspect-[4/3] bg-secondary">
                  {thumb?.type === "image" ? (
                    <Image
                      src={thumb.url}
                      alt={name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : thumb?.type === "video" ? (
                    <video
                      src={thumb.url}
                      className="absolute inset-0 h-full w-full object-cover"
                      muted
                      loop
                      playsInline
                      autoPlay
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Boxes className="size-10 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Status badge overlay */}
                  <div className="absolute left-3 top-3 flex gap-1.5">
                    <Badge variant={product.active ? "default" : "outline"}>
                      {product.active ? t("active") : t("inactive")}
                    </Badge>
                    {product.is_featured && (
                      <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
                        <Star className="size-3 fill-current" />
                      </Badge>
                    )}
                    {product.on_sale && (
                      <Badge variant="outline" className="gap-1 bg-red-50 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
                        <Percent className="size-3" />
                        {product.discount_type === "percentage" ? `${product.discount_value}%` : product.discount_value ? `$${((product.discount_value as number) / 100).toFixed(0)}` : ""}
                      </Badge>
                    )}
                  </div>
                </div>

                <CardContent className="space-y-3 p-4">
                  {/* Name + public link */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">
                        {name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {product.slug}
                      </p>
                    </div>
                    <a
                      href={`/${locale}/produto/${product.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={t("viewProduct")}
                      className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </div>

                  {/* Variants + Stock + Price */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("variants", {
                        count: product.product_variants.length,
                      })}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openStockDialog(product)}
                        title={t("editStock")}
                        className="group inline-flex items-center gap-1 rounded px-1 py-0.5 font-mono text-sm font-medium transition-colors hover:bg-secondary"
                      >
                        <PackageOpen className="size-3.5 text-muted-foreground" />
                        {(() => {
                          const total = getTotalStock(product);
                          return (
                            <span className={total === 0 ? "text-destructive" : total <= 5 ? "text-amber-600 dark:text-amber-400" : ""}>
                              {total}
                            </span>
                          );
                        })()}
                      </button>
                      <span className="font-mono font-medium">
                        {formatPrice(product.price_cents, locale)}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Actions: editar em destaque + sheet com o resto */}
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-11 flex-1 gap-1.5 md:h-9"
                    >
                      <Link href={`/${locale}/admin/produtos/${product.id}`}>
                        <Edit className="size-4" />
                        {t("editProduct")}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 w-11 shrink-0 p-0 md:h-9 md:w-9"
                      onClick={() => setActionsProduct(product)}
                      aria-label={`Mais ações: ${name}`}
                    >
                      {duplicatingId === product.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="size-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
            return isMobile ? (
              <SwipeableRow
                key={product.id}
                rightAction={{
                  label: "Estoque",
                  icon: PackageOpen,
                  onTrigger: () => openStockDialog(product),
                  className: "bg-primary text-primary-foreground",
                }}
              >
                {card}
              </SwipeableRow>
            ) : (
              <div key={product.id}>{card}</div>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>{t("title")}</TableHead>
                <TableHead>{t("active")}</TableHead>
                <TableHead className="text-right">{t("variantsHeader")}</TableHead>
                <TableHead className="text-right">{t("stockHeader")}</TableHead>
                <TableHead className="text-right">{t("price")}</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const thumb = getThumbnail(product);
                const name = getName(product);
                return (
                  <TableRow key={product.id}>
                    {/* Thumbnail */}
                    <TableCell className="py-2">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-secondary">
                        {thumb?.type === "image" ? (
                          <Image
                            src={thumb.url}
                            alt={name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : thumb?.type === "video" ? (
                          <video
                            src={thumb.url}
                            className="absolute inset-0 h-full w-full object-cover"
                            muted
                            playsInline
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Boxes className="size-5 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Name / slug */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight truncate max-w-[260px]">
                            {name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-[260px]">
                            {product.slug}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {product.is_featured && (
                            <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
                              <Star className="size-3 fill-current" />
                            </Badge>
                          )}
                          {product.on_sale && (
                            <Badge variant="outline" className="gap-1 bg-red-50 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
                              <Percent className="size-3" />
                              {product.discount_type === "percentage" ? `${product.discount_value}%` : product.discount_value ? `$${((product.discount_value as number) / 100).toFixed(0)}` : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant={product.active ? "default" : "outline"}>
                        {product.active ? t("active") : t("inactive")}
                      </Badge>
                    </TableCell>

                    {/* Variants */}
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {t("variants", { count: product.product_variants.length })}
                    </TableCell>

                    {/* Stock */}
                    <TableCell className="text-right">
                      <button
                        onClick={() => openStockDialog(product)}
                        title={t("editStock")}
                        className="group inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-sm font-medium transition-colors hover:bg-secondary"
                      >
                        {(() => {
                          const total = getTotalStock(product);
                          return (
                            <span className={total === 0 ? "text-destructive" : total <= 5 ? "text-amber-600 dark:text-amber-400" : ""}>
                              {total}
                            </span>
                          );
                        })()}
                        <Pencil className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </TableCell>

                    {/* Price */}
                    <TableCell className="text-right font-mono text-sm font-medium">
                      {formatPrice(product.price_cents, locale)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-2">
                      <div className="flex items-center justify-end gap-0.5">
                        <a
                          href={`/${locale}/produto/${product.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t("viewProduct")}
                        >
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="size-4" />
                          </Button>
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(product)}
                          title={product.active ? t("deactivate") : t("activate")}
                        >
                          {product.active ? (
                            <ToggleRight className="size-4" />
                          ) : (
                            <ToggleLeft className="size-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateProduct(product)}
                          disabled={duplicatingId === product.id}
                          title={t("duplicate")}
                        >
                          {duplicatingId === product.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </Button>
                        <Link href={`/${locale}/admin/produtos/${product.id}`}>
                          <Button variant="ghost" size="sm" title={t("editProduct")}>
                            <Edit className="size-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingProduct(product)}
                          title={t("delete")}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Action sheet do produto: duplicar, ativar, ver, excluir */}
      <ResponsiveOverlay
        open={!!actionsProduct}
        onOpenChange={(open) => !open && setActionsProduct(null)}
        title={actionsProduct ? getName(actionsProduct) : ""}
        description={actionsProduct?.slug}
      >
        {actionsProduct && (
          <div className="space-y-2 pb-2">
            <ActionSheetItem
              icon={PackageOpen}
              label={t("editStock")}
              onClick={() => {
                const target = actionsProduct;
                setActionsProduct(null);
                openStockDialog(target);
              }}
            />
            <ActionSheetItem
              icon={actionsProduct.active ? ToggleLeft : ToggleRight}
              label={actionsProduct.active ? t("deactivate") : t("activate")}
              onClick={async () => {
                const target = actionsProduct;
                setActionsProduct(null);
                await toggleActive(target);
              }}
            />
            <ActionSheetItem
              icon={Copy}
              label={t("duplicate")}
              onClick={async () => {
                const target = actionsProduct;
                setActionsProduct(null);
                await duplicateProduct(target);
              }}
            />
            <ActionSheetItem
              icon={ExternalLink}
              label={t("viewProduct")}
              href={`/${locale}/produto/${actionsProduct.slug}`}
              onClick={() => setActionsProduct(null)}
            />
            <ActionSheetItem
              icon={Trash2}
              label={t("delete")}
              destructive
              onClick={() => {
                const target = actionsProduct;
                setActionsProduct(null);
                setDeletingProduct(target);
              }}
            />
          </div>
        )}
      </ResponsiveOverlay>

      {/* Delete confirmation */}
      <ResponsiveOverlay
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
        title={t("deleteConfirmTitle")}
        description={
          deletingProduct
            ? t("deleteConfirmMessage", { name: getName(deletingProduct) })
            : undefined
        }
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-11 sm:h-10"
              onClick={() => setDeletingProduct(null)}
              disabled={deleting}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              className="h-11 gap-2 sm:h-10"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {t("delete")}
            </Button>
          </div>
        }
      >
        <span className="sr-only">{t("deleteConfirmTitle")}</span>
      </ResponsiveOverlay>

      {/* Stock edit — stepper −/+ com hit-area de 44px */}
      <ResponsiveOverlay
        open={!!editingStockProduct}
        onOpenChange={(open) => !open && setEditingStockProduct(null)}
        title={t("editStockTitle")}
        description={editingStockProduct ? getName(editingStockProduct) : undefined}
        dialogClassName="sm:max-w-sm"
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-11 sm:h-10"
              onClick={() => setEditingStockProduct(null)}
              disabled={savingStock}
            >
              {t("cancel")}
            </Button>
            <Button
              className="h-11 gap-2 sm:h-10"
              onClick={saveStock}
              disabled={savingStock}
            >
              {savingStock ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {t("saveStock")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-1">
          <div className="space-y-2">
            <label htmlFor="stock-input" className="text-sm font-medium">
              {t("totalSeedStock")}
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="size-11 shrink-0 p-0"
                aria-label="Diminuir estoque"
                onClick={() => setStockDraft((s) => Math.max(0, s - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <Input
                id="stock-input"
                type="number"
                inputMode="numeric"
                min={0}
                value={stockDraft}
                onChange={(e) =>
                  setStockDraft(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="h-11 text-center font-mono text-base"
              />
              <Button
                type="button"
                variant="outline"
                className="size-11 shrink-0 p-0"
                aria-label="Aumentar estoque"
                onClick={() => setStockDraft((s) => s + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("totalSeedStockHint")}
            </p>
          </div>
          {editingStockProduct &&
            editingStockProduct.product_variants.length > 0 && (
              <div className="rounded-md border bg-muted/40 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("packsAvailablePreview")}
                </p>
                <ul className="text-xs space-y-0.5">
                  {editingStockProduct.product_variants
                    .filter((v) => v.seed_count > 0)
                    .map((v) => {
                      const packs = Math.floor(stockDraft / v.seed_count);
                      return (
                        <li
                          key={v.id}
                          className="flex justify-between font-mono"
                        >
                          <span>
                            {v.seed_count} {t("seeds")}
                          </span>
                          <span>{packs}</span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
        </div>
      </ResponsiveOverlay>
    </div>
    </PullToRefresh>
  );
}

/* ── Item do action sheet ── */

function ActionSheetItem({
  icon: Icon,
  label,
  onClick,
  href,
  destructive,
}: {
  icon: typeof Edit;
  label: string;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
}) {
  const className = cn(
    "flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 text-left text-sm font-medium transition-colors",
    destructive
      ? "border-destructive/30 text-destructive hover:bg-destructive/10"
      : "hover:bg-secondary"
  );
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={className}
      >
        <Icon className={cn("size-4", !destructive && "text-muted-foreground")} aria-hidden />
        {label}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      <Icon className={cn("size-4", !destructive && "text-muted-foreground")} aria-hidden />
      {label}
    </button>
  );
}
