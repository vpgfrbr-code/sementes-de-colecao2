import { create } from "zustand";

export interface CartConfirmationItem {
  name: string;
  variantLabel: string;
  priceCents: number;
  originalPriceCents?: number;
  image: string;
}

interface CartConfirmationState {
  isOpen: boolean;
  item: CartConfirmationItem | null;
  show: (item: CartConfirmationItem) => void;
  hide: () => void;
}

export const useCartConfirmationStore = create<CartConfirmationState>()(
  (set) => ({
    isOpen: false,
    item: null,
    show: (item) => set({ isOpen: true, item }),
    hide: () => set({ isOpen: false, item: null }),
  })
);
