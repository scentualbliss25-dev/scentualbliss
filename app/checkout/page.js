import { Suspense } from 'react';
import CheckoutPageClient from '@/components/pages/CheckoutPageClient';

export const metadata = {
  title: 'Checkout — Finalizar Compra',
  description: 'Completa tu pedido de forma segura. Pago con tarjeta, PayPal y más.',
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutPageClient />
    </Suspense>
  );
}
