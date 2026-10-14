import { create } from "zustand";

interface HeaderThemeState {
  /** Number of mounted dark-section sentinels currently intersecting the viewport */
  darkCount: number;
  increment: () => void;
  decrement: () => void;
}

export const useHeaderThemeStore = create<HeaderThemeState>()((set) => ({
  darkCount: 0,
  increment: () => set((s) => ({ darkCount: s.darkCount + 1 })),
  decrement: () => set((s) => ({ darkCount: Math.max(0, s.darkCount - 1) })),
}));
