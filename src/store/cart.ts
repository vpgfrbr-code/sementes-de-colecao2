import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantLabel: string;
  priceCents: number;
  originalPriceCents?: number;
  shippingCents: number;
  quantity: number;
  image: string;
  video?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalCents: () => number;
  totalShippingCents: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, qty = 1) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.variantId === item.variantId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, quantity: i.quantity + qty }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: qty }] };
        }),

      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),

      updateQuantity: (variantId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.variantId !== variantId)
              : state.items.map((i) =>
                  i.variantId === variantId ? { ...i, quantity } : i
                ),
        })),

      clearCart: () => set({ items: [] }),

      totalItems: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalCents: () =>
        get().items.reduce(
          (sum, i) => sum + i.priceCents * i.quantity,
          0
        ),

      totalShippingCents: () =>
        get().items.reduce(
          (max, i) => Math.max(max, i.shippingCents),
          0
        ),
    }),
    { name: "sementes-cart" }
  )
);
