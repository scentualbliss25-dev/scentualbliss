import { Suspense } from 'react';
import OrderConfirmPageClient from '@/components/pages/OrderConfirmPageClient';

export const metadata = {
  title: 'Pedido Confirmado — Gracias por tu Compra',
  robots: { index: false },
};

export default function OrderConfirmPage() {
  return (
    <Suspense>
      <OrderConfirmPageClient />
    </Suspense>
  );
}
