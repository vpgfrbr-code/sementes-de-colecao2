# Phase 4.1: Cart Store

## Steps

### 1. Zustand Cart Store

`src/store/cart.ts`:

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  quantity: number;
  image: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalCents: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity } : i
                ),
        })),
      clearCart: () => set({ items: [] }),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalCents: () =>
        get().items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),
    }),
    { name: "sementes-cart" }
  )
);
```

### 2. Hydration Guard

To avoid SSR mismatches with Zustand persist, create a hook:

```typescript
// src/hooks/use-cart-hydration.ts
import { useEffect, useState } from "react";

export function useCartHydration() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
```

Use in client components: render cart count/total only after `hydrated === true`.

## Completion Criteria

- [ ] Cart persists across page reloads (localStorage key: `sementes-cart`)
- [ ] `addItem` increments quantity if product already in cart
- [ ] `updateQuantity(id, 0)` removes the item
- [ ] No hydration mismatches
