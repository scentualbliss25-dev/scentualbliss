'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Defensa: si items se hidrata como undefined/null o con elementos malformados,
// no queremos que el reduce explote y rompa toda la página.
const safeItems = (items) => (Array.isArray(items) ? items : []);

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, selectedSize) => {
        const items = safeItems(get().items);
        const key = `${product.id}-${selectedSize}`;
        // El precio viene de la talla seleccionada (no del campo `price` base del producto)
        const sizeObj = product.sizes?.find((s) => s.ml === selectedSize);
        const price = sizeObj?.price ?? product.price ?? 0;
        const existing = items.find((i) => i.key === key);
        if (existing) {
          set({ items: items.map((i) => i.key === key ? { ...i, quantity: (i.quantity || 0) + 1 } : i) });
        } else {
          set({ items: [...items, { ...product, selectedSize, price, key, quantity: 1 }] });
        }
        set({ isOpen: true });
      },

      removeItem: (key) => set({ items: safeItems(get().items).filter((i) => i.key !== key) }),

      updateQuantity: (key, qty) => {
        if (qty < 1) { get().removeItem(key); return; }
        set({ items: safeItems(get().items).map((i) => i.key === key ? { ...i, quantity: qty } : i) });
      },

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set({ isOpen: !get().isOpen }),
    }),
    {
      name: 'scentualbliss-cart',
      // Solo persistir items + isOpen — descarta basura vieja del localStorage.
      partialize: (state) => ({ items: safeItems(state.items), isOpen: state.isOpen }),
      // Si la deserialización falla, limpia storage. Si los datos son válidos
      // pero items no es array, lo normalizamos aquí (post-rehidratación).
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('[cart] Error hidratando, limpiando storage:', error);
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('scentualbliss-cart');
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

// Selectores: los getters dentro del create() no funcionan con persist.
// (i.price || 0) y (i.quantity || 0) protegen contra items malformados en storage viejo.
export const useCartTotal = () =>
  useCartStore((state) =>
    safeItems(state.items).reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0)
  );

export const useCartCount = () =>
  useCartStore((state) =>
    safeItems(state.items).reduce((sum, i) => sum + (i.quantity || 0), 0)
  );
