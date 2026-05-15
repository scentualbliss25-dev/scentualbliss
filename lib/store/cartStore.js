'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, selectedSize) => {
        const { items } = get();
        const key = `${product.id}-${selectedSize}`;
        // El precio viene de la talla seleccionada (no del campo `price` base del producto)
        const sizeObj = product.sizes?.find((s) => s.ml === selectedSize);
        const price = sizeObj?.price ?? product.price ?? 0;
        const existing = items.find((i) => i.key === key);
        if (existing) {
          set({ items: items.map((i) => i.key === key ? { ...i, quantity: i.quantity + 1 } : i) });
        } else {
          set({ items: [...items, { ...product, selectedSize, price, key, quantity: 1 }] });
        }
        set({ isOpen: true });
      },

      removeItem: (key) => set({ items: get().items.filter((i) => i.key !== key) }),

      updateQuantity: (key, qty) => {
        if (qty < 1) { get().removeItem(key); return; }
        set({ items: get().items.map((i) => i.key === key ? { ...i, quantity: qty } : i) });
      },

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set({ isOpen: !get().isOpen }),
    }),
    { name: 'scentualbliss-cart' }
  )
);

// Selectores: los getters dentro del create() no funcionan con persist (se pierden al
// serializar/hidratar). Calcular desde `items` en cada render es la forma estándar.
export const useCartTotal = () =>
  useCartStore((state) => state.items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0));

export const useCartCount = () =>
  useCartStore((state) => state.items.reduce((sum, i) => sum + i.quantity, 0));
