'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Defensa: si items se hidrata como undefined/null o con elementos malformados,
// no queremos que el reduce explote y rompa toda la página.
const safeItems = (items) => (Array.isArray(items) ? items : []);

// Normaliza selectedSize: en el pasado algunos componentes pasaban el objeto
// {ml, price} entero en lugar del string `ml`. Eso quedaba persistido en
// localStorage y luego el CartDrawer intentaba renderizar `selectedSize`
// como children de React → "Objects are not valid as a React child" → rompía
// toda la home. Esta función acepta string, objeto {ml,...} o undefined y
// siempre devuelve string.
const normalizeSize = (s) => {
  if (typeof s === 'string') return s;
  if (s && typeof s === 'object' && typeof s.ml === 'string') return s.ml;
  return '100ml';
};

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, selectedSize) => {
        const items = safeItems(get().items);
        const sizeStr = normalizeSize(selectedSize);
        const key = `${product.id}-${sizeStr}`;
        // El precio viene de la talla seleccionada (no del campo `price` base del producto)
        const sizeObj = product.sizes?.find((s) => s.ml === sizeStr);
        const price = sizeObj?.price ?? product.price ?? 0;
        const existing = items.find((i) => i.key === key);
        if (existing) {
          set({ items: items.map((i) => i.key === key ? { ...i, quantity: (i.quantity || 0) + 1 } : i) });
        } else {
          set({ items: [...items, { ...product, selectedSize: sizeStr, price, key, quantity: 1 }] });
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
      // También migramos items con selectedSize=objeto (legacy bug pre-jun 2026)
      // a selectedSize=string para que el CartDrawer no reviente al renderlos.
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
          return;
        }
        // Migración: si algún item tiene selectedSize como objeto {ml, price}
        // lo aplanamos a string ml. Si no era objeto, lo dejamos igual.
        if (state?.items?.length) {
          state.items = state.items.map((i) => {
            const sel = i?.selectedSize;
            if (sel && typeof sel === 'object' && typeof sel.ml === 'string') {
              return { ...i, selectedSize: sel.ml, key: `${i.id}-${sel.ml}` };
            }
            return i;
          });
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
