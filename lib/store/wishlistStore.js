'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Mismo patrón defensivo que cartStore: si items se hidrata como undefined/null
// (localStorage corrupto de versiones viejas), no queremos que .some() / .filter()
// exploten y rompan toda la página con "Application error".
const safeItems = (items) => (Array.isArray(items) ? items : []);

export const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],
      toggle: (product) => {
        const items = safeItems(get().items);
        const exists = items.some(i => i.id === product.id);
        set({ items: exists ? items.filter(i => i.id !== product.id) : [...items, product] });
      },
    }),
    {
      name: 'scentualbliss-wishlist',
      partialize: (state) => ({ items: safeItems(state.items) }),
      // Si la deserialización falla, limpia storage. Si items no es array, normaliza.
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('[wishlist] Error hidratando, limpiando storage:', error);
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('scentualbliss-wishlist');
          }
          return;
        }
        if (state && !Array.isArray(state.items)) {
          state.items = [];
        }
      },
    }
  )
);
