'use client';
import dynamic from 'next/dynamic';

// Wrapper Client Component para aislar los 3 componentes interactivos del
// admin con ssr:false. Si uno revienta en hidratación, no derriba toda la
// página del admin. Antes pasaba: las órdenes salían y se ocultaban.
const SyncAllPendingButton = dynamic(
  () => import('./SyncButtons').then(m => m.SyncAllPendingButton),
  { ssr: false }
);
const PushToggle = dynamic(
  () => import('./PushToggle').then(m => m.PushToggle),
  { ssr: false }
);
const OrdersTable = dynamic(
  () => import('./OrdersTable').then(m => m.OrdersTable),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b7280', fontSize: '.9rem' }}>
        Cargando órdenes…
      </div>
    ),
  }
);

export function AdminHeader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <PushToggle />
      <SyncAllPendingButton />
    </div>
  );
}

export function AdminOrdersTable({ orders }) {
  return <OrdersTable orders={orders} />;
}
