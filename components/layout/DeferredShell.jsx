'use client';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

// Componentes no críticos para el primer paint:
// - CartDrawer: solo se necesita cuando el usuario agrega al carrito
// - WhatsAppFloat / ScrollToTop: floating buttons, no afectan above-the-fold
// Cargan después de hidratar, no se SSR-rinden — sacan framer-motion y código UI
// pesado del bundle inicial.
//
// Estos son elementos de la TIENDA PÚBLICA: no deben aparecer en /admin/*.
const CartDrawer = dynamic(() => import('@/components/cart/CartDrawer'), { ssr: false });
const WhatsAppFloat = dynamic(() => import('@/components/ui/WhatsAppFloat'), { ssr: false });
const ScrollToTop = dynamic(() => import('@/components/ui/ScrollToTop'), { ssr: false });

export default function DeferredShell() {
  const pathname = usePathname();
  if (pathname === '/admin' || pathname?.startsWith('/admin/')) return null;
  return (
    <>
      <CartDrawer />
      <WhatsAppFloat />
      <ScrollToTop />
    </>
  );
}
