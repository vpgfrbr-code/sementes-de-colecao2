"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Star,
  Trash2,
  Search,
  Boxes,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { haptic } from "@/lib/haptics";
import { runMutation } from "@/lib/admin-mutation";
import { useAdminSaveRegistration } from "../_components/admin-save-context";
import { AdminEmptyState } from "../_components/ui/admin-empty-state";
import { ListPageSkeleton } from "../_components/ui/admin-skeletons";
import { ResponsiveOverlay } from "../_components/ui/responsive-overlay";

interface FeaturedProduct {
  id: string;
  slug: string;
  images: string[];
  featured_order: number;
  active: boolean;
  product_translations: { locale: string; name: string }[];
}

interface AllProduct {
  id: string;
  slug: string;
  images: string[];
  is_featured: boolean;
  product_translations: { locale: string; name: string }[];
}

function SortableItem({
  product,
  locale,
  onRemove,
}: {
  product: FeaturedProduct;
  locale: string;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  const name =
    product.product_translations.find((t) => t.locale === locale)?.name ??
    product.product_translations[0]?.name ??
    product.slug;

  const thumb = product.images.find((img) => !/\.(mp4|webm|mov)($|\?)/i.test(img));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-md border bg-card p-3 ${isDragging ? "shadow-lg ring-2 ring-primary" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Arrastar para reordenar"
        className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-5" />
      </button>

      <div className="relative size-12 shrink-0 overflow-hidden rounded bg-secondary">
        {thumb ? (
          <Image src={thumb} alt={name} fill className="object-cover" sizes="48px" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Boxes className="size-5 text-muted-foreground/30" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-xs text-muted-foreground truncate">{product.slug}</p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="size-11 shrink-0 p-0 md:size-9"
        onClick={() => onRemove(product.id)}
        aria-label="Remover destaque"
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </div>
  );
}

export default function FeaturedPage() {
  const locale = useLocale();
  const [items, setItems] = useState<FeaturedProduct[]>([]);
  const [allProducts, setAllProducts] = useState<AllProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");

  useAdminSaveRegistration({
    label: "Salvar Ordem",
    canSave: dirty,
    saving,
    dirty,
    onSave: handleSave,
  });

  // No touch o drag só ativa após um press de 200ms (senão rouba o scroll
  // da lista); no mouse exige 8px de movimento para não engolir cliques.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchFeatured = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/featured");
      if (res.ok) setItems(await res.json());
    } catch {
      toast.error("Não foi possível carregar os destaques.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);

  async function fetchAllProducts() {
    try {
      const res = await fetch("/api/admin/products");
      if (res.ok) setAllProducts(await res.json());
    } catch {
      toast.error("Não foi possível carregar os produtos.");
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    haptic("tick");
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    await runMutation({
      url: "/api/admin/featured",
      method: "PUT",
      body: {
        items: items.map((item, idx) => ({
          id: item.id,
          featured_order: idx,
        })),
      },
      successMessage: "Ordem dos destaques salva",
      errorMessage: "Falha ao salvar a ordem.",
      onSuccess: () => setDirty(false),
    });
    setSaving(false);
  }

  async function addProduct(product: AllProduct) {
    await runMutation({
      url: `/api/admin/products/${product.id}`,
      method: "PUT",
      body: { is_featured: true, featured_order: items.length },
      successMessage: "Produto adicionado aos destaques",
      errorMessage: "Falha ao adicionar o produto.",
      onSuccess: () => {
        setDialogOpen(false);
        void fetchFeatured();
      },
    });
  }

  async function removeProduct(id: string) {
    await runMutation({
      url: `/api/admin/products/${id}`,
      method: "PUT",
      body: { is_featured: false, featured_order: 0 },
      successMessage: "Produto removido dos destaques",
      errorMessage: "Falha ao remover o produto.",
      onSuccess: () => {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setDirty(true);
      },
    });
  }

  const featuredIds = new Set(items.map((i) => i.id));
  const filteredAll = allProducts.filter(
    (p) =>
      !featuredIds.has(p.id) &&
      (p.product_translations.some((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
      ) ||
        p.slug.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return <ListPageSkeleton variant="table" count={5} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Star className="size-6 text-amber-500" />
            Destaques
          </h1>
          <p className="text-sm text-muted-foreground">
            Arraste para reordenar os produtos em destaque na vitrine.
          </p>
        </div>
        <Button
          variant="outline"
          className="h-11 shrink-0 md:h-9"
          onClick={() => {
            setDialogOpen(true);
            fetchAllProducts();
          }}
        >
          <Plus className="mr-1 size-4" />
          Adicionar
        </Button>
      </div>

      <ResponsiveOverlay
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Adicionar Produto em Destaque"
        description="Busque e selecione um produto para destacar na home."
      >
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 pl-9 md:h-10"
            />
          </div>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto pb-2 pr-1">
            {filteredAll.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum produto encontrado
              </p>
            ) : (
              filteredAll.map((p) => {
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
                    onClick={() => addProduct(p)}
                    className="flex min-h-12 w-full items-center gap-3 rounded-md border p-2 text-left transition-colors hover:bg-secondary"
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
                      <p className="text-xs text-muted-foreground truncate">
                        {p.slug}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </ResponsiveOverlay>

      {items.length === 0 ? (
        <AdminEmptyState
          icon={Star}
          title="Nenhum produto em destaque"
          description='Clique em "Adicionar" para selecionar produtos para a vitrine.'
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {items.length} {items.length === 1 ? "produto" : "produtos"} em destaque
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.map((product) => (
                  <SortableItem
                    key={product.id}
                    product={product}
                    locale={locale}
                    onRemove={removeProduct}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
