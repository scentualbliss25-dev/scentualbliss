import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { formatCOP } from '@/lib/format';
import { SyncOrderButton } from '../SyncButtons';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STATUS_STYLES = {
  approved: { bg: '#10b98122', color: '#059669', label: 'Aprobada' },
  pending:  { bg: '#f59e0b22', color: '#b45309', label: 'Pendiente' },
  declined: { bg: '#ef444422', color: '#b91c1c', label: 'Rechazada' },
  voided:   { bg: '#6b728022', color: '#374151', label: 'Anulada' },
  error:    { bg: '#ef444422', color: '#b91c1c', label: 'Error' },
};

export default async function OrderDetailPage({ params }) {
  const { id } = await params;
  if (!supabaseAdmin) return <main style={{ padding: 40 }}>Supabase no configurado.</main>;

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single();

  if (error || !order) notFound();

  const status = STATUS_STYLES[order.status] || { bg: '#e5e7eb', color: '#374151', label: order.status };

  const Field = ({ label, value }) => (
    <div>
      <p style={{ fontSize: '.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: '.92rem', color: '#1f2937', margin: 0 }}>{value || '—'}</p>
    </div>
  );

  return (
    <main style={{ padding: '32px 24px', maxWidth: 980, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1f2937' }}>
      <Link href="/admin/orders" style={{ fontSize: '.82rem', color: '#2563eb', textDecoration: 'none', display: 'inline-block', marginBottom: 14 }}>← Volver a órdenes</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, fontFamily: 'ui-monospace, monospace' }}>{order.reference}</h1>
          <p style={{ fontSize: '.85rem', color: '#6b7280', marginTop: 4 }}>
            {new Date(order.created_at).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>
        <span style={{
          background: status.bg, color: status.color,
          padding: '6px 14px', borderRadius: 99,
          fontSize: '.78rem', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '.06em',
        }}>{status.label}</span>
      </div>

      <div style={{ marginBottom: 24 }}>
        <SyncOrderButton orderId={order.id} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 18 }}>
          <h2 style={{ fontSize: '.78rem', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '.08em', marginBottom: 14, marginTop: 0 }}>Cliente</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Nombre" value={order.customer_name} />
            <Field label="Email"  value={order.customer_email} />
            <Field label="Teléfono" value={order.customer_phone} />
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 18 }}>
          <h2 style={{ fontSize: '.78rem', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '.08em', marginBottom: 14, marginTop: 0 }}>Envío</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Dirección" value={order.shipping_address} />
            <Field label="Ciudad"    value={order.shipping_city} />
            <Field label="Departamento" value={order.shipping_department} />
          </div>
        </div>
      </div>

      {/* Items */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <h2 style={{ fontSize: '.78rem', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '.08em', margin: 0 }}>Productos ({order.order_items?.length || 0})</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
          <tbody>
            {(order.order_items || []).map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '14px 18px' }}>
                  <div style={{ fontWeight: 500 }}>{item.product_name}</div>
                  {item.selected_size && <div style={{ fontSize: '.78rem', color: '#6b7280' }}>{item.selected_size}</div>}
                </td>
                <td style={{ padding: '14px 18px', textAlign: 'center', color: '#6b7280', fontSize: '.85rem' }}>×{item.quantity}</td>
                <td style={{ padding: '14px 18px', textAlign: 'right' }}>{formatCOP(Number(item.unit_price)) || '$0'}</td>
                <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 600 }}>{formatCOP(Number(item.total_price)) || '$0'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'grid', gap: 8, maxWidth: 320, marginLeft: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.88rem' }}>
            <span style={{ color: '#6b7280' }}>Subtotal</span>
            <span>{formatCOP(Number(order.subtotal)) || '$0'}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.88rem', color: '#059669' }}>
              <span>Descuento</span>
              <span>−{formatCOP(Number(order.discount))}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.88rem' }}>
            <span style={{ color: '#6b7280' }}>Envío</span>
            <span>{Number(order.shipping_cost) > 0 ? formatCOP(Number(order.shipping_cost)) : 'Gratis'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 700, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
            <span>Total</span>
            <span>{formatCOP(Number(order.total)) || '$0'}</span>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: '.82rem' }}>
        <Field label="Método de pago" value={order.payment_method} />
        <Field label="Wompi TX ID" value={order.wompi_tx_id} />
        <Field label="Última actualización" value={new Date(order.updated_at).toLocaleString('es-CO')} />
      </div>
    </main>
  );
}
