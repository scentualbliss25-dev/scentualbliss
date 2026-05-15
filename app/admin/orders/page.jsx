import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { formatCOP } from '@/lib/format';
import { SyncAllPendingButton } from './SyncButtons';
import { PushToggle } from './PushToggle';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STATUS_STYLES = {
  approved: { bg: '#10b98122', color: '#059669', label: 'Aprobada' },
  pending:  { bg: '#f59e0b22', color: '#b45309', label: 'Pendiente' },
  declined: { bg: '#ef444422', color: '#b91c1c', label: 'Rechazada' },
  voided:   { bg: '#6b728022', color: '#374151', label: 'Anulada' },
  error:    { bg: '#ef444422', color: '#b91c1c', label: 'Error' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { bg: '#e5e7eb', color: '#374151', label: status || '?' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: 99,
      fontSize: '.7rem', fontWeight: 600,
      letterSpacing: '.04em', textTransform: 'uppercase',
    }}>{s.label}</span>
  );
}

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
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return (
      <main style={{ padding: 40, fontFamily: 'system-ui' }}>
        <h1>Error consultando órdenes</h1>
        <pre style={{ background: '#fee', padding: 16, borderRadius: 8 }}>{JSON.stringify(error, null, 2)}</pre>
      </main>
    );
  }

  // Stats rápidas
  const stats = {
    total: orders.length,
    approved: orders.filter(o => o.status === 'approved').length,
    pending: orders.filter(o => o.status === 'pending').length,
    revenue: orders.filter(o => o.status === 'approved').reduce((s, o) => s + Number(o.total || 0), 0),
  };

  return (
    <main style={{ padding: '32px 24px', maxWidth: 1280, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1f2937' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>Órdenes</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <PushToggle />
          <SyncAllPendingButton />
          <p style={{ fontSize: '.85rem', color: '#6b7280', margin: 0 }}>Últimas 100</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Órdenes totales', value: stats.total, color: '#1f2937' },
          { label: 'Aprobadas',       value: stats.approved, color: '#059669' },
          { label: 'Pendientes',      value: stats.pending,  color: '#b45309' },
          { label: 'Ingresos (aprobadas)', value: formatCOP(stats.revenue) || '$0', color: '#1f2937' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <p style={{ fontSize: '.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      {orders.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#f9fafb', borderRadius: 8, color: '#6b7280' }}>
          Aún no hay órdenes. Cuando alguien complete un checkout en la tienda, aparecerá acá.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.06em', color: '#6b7280' }}>Referencia</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.06em', color: '#6b7280' }}>Cliente</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.06em', color: '#6b7280' }}>Items</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.06em', color: '#6b7280' }}>Total</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.06em', color: '#6b7280' }}>Estado</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.06em', color: '#6b7280' }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', fontFamily: 'ui-monospace, monospace', fontSize: '.78rem' }}>
                    <Link href={`/admin/orders/${o.id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{o.reference}</Link>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 500 }}>{o.customer_name}</div>
                    <div style={{ fontSize: '.78rem', color: '#6b7280' }}>{o.customer_email}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#6b7280' }}>{o.order_items?.length || 0}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600 }}>{formatCOP(Number(o.total)) || '$0'}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}><StatusBadge status={o.status} /></td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#6b7280', fontSize: '.78rem' }}>
                    {new Date(o.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
