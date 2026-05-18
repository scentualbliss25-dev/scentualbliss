import { create } from 'zustand';

export const useQuickViewStore = create((set) => ({
  product: null,
  open: (product) => set({ product }),
  close: () => set({ product: null }),
}));
