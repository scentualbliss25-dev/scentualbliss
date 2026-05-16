import { supabaseAdmin } from '@/lib/supabase';
import { SyncAllPendingButton } from './SyncButtons';
import { PushToggle } from './PushToggle';
import { OrdersTable } from './OrdersTable';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminOrdersPage() {
  if (!supabaseAdmin) {
    return (
      <main style={{ padding: 40, fontFamily: 'system-ui' }}>
        <h1>Supabase no configurado</h1>
        <p>Falta NEXT_PUBLIC_SUPABASE_URL o claves.</p>
      </main>
    );
  }

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(id)')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return (
      <main style={{ padding: 40, fontFamily: 'system-ui' }}>
        <h1>Error consultando órdenes</h1>
        <pre style={{ background: '#fee', padding: 16, borderRadius: 8 }}>{JSON.stringify(error, null, 2)}</pre>
      </main>
    );
  }

  return (
    <main style={{ padding: '32px 24px', maxWidth: 1400, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1f2937' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>Órdenes</h1>
          <p style={{ fontSize: '.82rem', color: '#6b7280', margin: '4px 0 0' }}>
            Últimas {orders?.length || 0} órdenes
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <PushToggle />
          <SyncAllPendingButton />
        </div>
      </div>

      <OrdersTable orders={orders || []} />
    </main>
  );
}
