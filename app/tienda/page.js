import { Suspense } from 'react';
import ShopPageClient from '@/components/pages/ShopPageClient';

export const metadata = {
  title: 'Tienda — Todos los Perfumes de Lujo',
  description: 'Explora nuestra colección completa de fragancias exclusivas. Filtra por categoría, precio y bestsellers. Envío gratis en pedidos mayores a $100.',
};

export default function TiendaPage() {
  return (
    <Suspense>
      <ShopPageClient />
    </Suspense>
  );
}
