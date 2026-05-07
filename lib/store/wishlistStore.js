'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],
      toggle: (product) => {
        const { items } = get();
        const exists = items.some(i => i.id === product.id);
        set({ items: exists ? items.filter(i => i.id !== product.id) : [...items, product] });
      },
    }),
    { name: 'scentualbliss-wishlist' }
  )
);
