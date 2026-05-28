'use client';
import dynamic from 'next/dynamic';

// Componentes no críticos para el primer paint:
// - CartDrawer: solo se necesita cuando el usuario agrega al carrito
// - WhatsAppFloat / ScrollToTop: floating buttons, no afectan above-the-fold
// Cargan después de hidratar, no se SSR-rinden — sacan framer-motion y código UI
// pesado del bundle inicial.
const CartDrawer = dynamic(() => import('@/components/cart/CartDrawer'), { ssr: false });
const WhatsAppFloat = dynamic(() => import('@/components/ui/WhatsAppFloat'), { ssr: false });
const ScrollToTop = dynamic(() => import('@/components/ui/ScrollToTop'), { ssr: false });

export default function DeferredShell() {
  return (
    <>
      <CartDrawer />
      <WhatsAppFloat />
      <ScrollToTop />
    </>
  );
}
