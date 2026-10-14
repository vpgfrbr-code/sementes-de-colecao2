import Link from "next/link";
import { AlertTriangle, PackageX } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LowStockAlertProps {
  locale: string;
  threshold?: number;
}

export async function LowStockAlert({
  locale,
  threshold = 5,
}: LowStockAlertProps) {
  const supabase = createServerClient();

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, slug, active, product_type, stock, product_translations(locale, name), bundle_components!bundle_components_bundle_product_id_fkey(seed_count, products!bundle_components_component_product_id_fkey(stock))"
    )
    .eq("active", true);

  if (!products) return null;

  const items = products
    .map((p) => {
      // For bundles, derive effective stock from component availability:
      // floor(component.stock / component.seed_count), min across components.
      let total: number;
      if (p.product_type === "bundle") {
        const components = (p.bundle_components ?? []) as {
          seed_count: number;
          products: { stock: number } | null;
        }[];
        if (components.length === 0) {
          total = 0;
        } else {
          let effective = Number.POSITIVE_INFINITY;
          for (const comp of components) {
            const compStock = comp?.products?.stock ?? 0;
            const seedCount = comp?.seed_count ?? 0;
            if (seedCount > 0) {
              effective = Math.min(effective, Math.floor(compStock / seedCount));
            } else {
              effective = 0;
              break;
            }
          }
          total = Number.isFinite(effective) ? effective : 0;
        }
      } else {
        // products.stock is the unified seed-level total (migration 028).
        total = (p as { stock?: number }).stock ?? 0;
      }
      const name =
        p.product_translations?.find(
          (t: { locale: string }) => t.locale === locale
        )?.name ??
        p.product_translations?.[0]?.name ??
        p.slug;
      return { id: p.id, slug: p.slug, name, total };
    })
    .filter((p) => p.total <= threshold)
    .sort((a, b) => a.total - b.total);

  if (items.length === 0) return null;

  const outOfStock = items.filter((i) => i.total === 0).length;
  const low = items.length - outOfStock;

  return (
    <Card className="border-amber-300 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Alerta de estoque
          </h3>
          <div className="ml-auto flex items-center gap-2">
            {outOfStock > 0 && (
              <Badge
                variant="outline"
                className="gap-1 border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
              >
                <PackageX className="size-3" />
                {outOfStock} sem estoque
              </Badge>
            )}
            {low > 0 && (
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
              >
                {low} com estoque baixo
              </Badge>
            )}
          </div>
        </div>
        <ul className="divide-y divide-amber-200/60 dark:divide-amber-900/40">
          {items.slice(0, 5).map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2 text-sm">
              <Link
                href={`/${locale}/admin/produtos/${item.id}`}
                className="truncate pr-3 font-medium hover:underline"
              >
                {item.name}
              </Link>
              <span
                className={`shrink-0 font-mono text-xs font-semibold ${
                  item.total === 0
                    ? "text-red-700 dark:text-red-400"
                    : "text-amber-700 dark:text-amber-400"
                }`}
              >
                {item.total} un.
              </span>
            </li>
          ))}
        </ul>
        {items.length > 5 && (
          <Link
            href={`/${locale}/admin/produtos`}
            className="block text-xs text-amber-700 hover:underline dark:text-amber-400"
          >
            Ver mais {items.length - 5} produto(s) com estoque baixo
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
