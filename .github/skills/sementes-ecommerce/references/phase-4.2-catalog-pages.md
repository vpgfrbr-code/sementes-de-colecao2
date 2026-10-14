# Phase 4.2: Catalog and Product Pages

## Steps

### 1. Catalog Page (Server Component)

`src/app/[locale]/page.tsx`:

```typescript
import { createServerClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";
import { ProductCard } from "@/components/product/product-card";

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getTranslations("common");
  const supabase = createServerClient();

  const { data: products } = await supabase
    .from("products")
    .select(`
      id, slug, price_cents, stock, images,
      product_translations!inner(name, description)
    `)
    .eq("product_translations.locale", locale)
    .eq("active", true)
    .order("created_at", { ascending: false });

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t("brand")}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products?.map((product) => (
          <ProductCard key={product.id} product={product} locale={locale} />
        ))}
      </div>
    </main>
  );
}
```

### 2. Product Card (Client Component)

`src/components/product/product-card.tsx`:

- Uses `Card` from shadcn/ui
- `ShoppingCart` icon from lucide-react for add-to-cart button
- Format prices with `Intl.NumberFormat` using locale
- Link to `/[locale]/produto/[slug]`

### 3. Product Detail Page (Server Component)

`src/app/[locale]/produto/[slug]/page.tsx`:

- Fetch product by slug from Supabase
- Render images with `next/image` (priority for LCP)
- Include a client `AddToCartButton` component
- Generate `metadata` for SEO via `generateMetadata()`

### 4. Cart Drawer (Client Component)

`src/components/cart/cart-drawer.tsx`:

- Uses shadcn `Sheet` component
- Lists cart items with quantity controls
- Shows running total formatted by locale
- "Finalizar Compra" button links to `/[locale]/checkout`
- Use hydration guard to avoid SSR mismatch

### 5. Price Formatting Utility

```typescript
// src/lib/format-price.ts
export function formatPrice(cents: number, locale: string) {
  return new Intl.NumberFormat(locale === "pt" ? "pt-BR" : locale === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
```

## Completion Criteria

- [ ] Catalog loads products from Supabase (Server Component)
- [ ] Product translations display in the active locale
- [ ] Product detail page renders at `/[locale]/produto/[slug]`
- [ ] Cart drawer opens/closes, shows correct totals
- [ ] Images use `next/image` with proper sizing
