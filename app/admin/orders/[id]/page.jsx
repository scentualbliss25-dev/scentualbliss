import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { formatCOP } from '@/lib/format';
import { SyncOrderButton } from '../SyncButtons';
import { OrderActions } from './OrderActions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = { robots: { index: false, follow: false } };

const STATUS_STYLES = {
  approved:  { bg: 'rgba(34, 145, 99, 0.13)',  color: '#1f6b48', label: 'Aprobada' },
  pending:   { bg: 'rgba(196, 107, 30, 0.14)', color: '#8d4a17', label: 'Pendiente' },
  declined:  { bg: 'rgba(170, 50, 50, 0.13)',  color: '#8a2a2a', label: 'Rechazada' },
  voided:    { bg: 'rgba(28, 22, 17, 0.08)',   color: 'rgba(28, 22, 17, 0.65)', label: 'Anulada' },
  error:     { bg: 'rgba(170, 50, 50, 0.13)',  color: '#8a2a2a', label: 'Error' },
  shipped:   { bg: 'rgba(70, 110, 195, 0.13)', color: '#2c5394', label: 'Enviada' },
  delivered: { bg: 'rgba(34, 145, 99, 0.13)',  color: '#1f6b48', label: 'Entregada' },
};

export default async function OrderDetailPage({ params }) {
  const { id } = await params;
  if (!supabaseAdmin) {
    return (
      <div className="od">
        <p style={{ color: 'rgba(28, 22, 17, 0.6)' }}>Supabase no configurado.</p>
        <OrderDetailStyles />
      </div>
    );
  }

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single();

  if (error || !order) notFound();

  const status = STATUS_STYLES[order.status] || { bg: 'rgba(28, 22, 17, 0.08)', color: 'rgba(28, 22, 17, 0.6)', label: order.status };

  const Field = ({ label, value, mono }) => (
    <div>
      <p className="od-field-label">{label}</p>
      <p className={`od-field-value ${mono ? 'is-mono' : ''}`}>{value || '—'}</p>
    </div>
  );

  return (
    <div className="od">
      <Link href="/admin/orders" className="od-back">← Volver a órdenes</Link>

      <div className="od-titlebar">
        <div>
          <h1 className="od-ref">{order.reference}</h1>
          <p className="od-date">
            {new Date(order.created_at).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>
        <span className="od-status" style={{ background: status.bg, color: status.color }}>{status.label}</span>
      </div>

      <div className="od-sync">
        <SyncOrderButton orderId={order.id} />
      </div>

      <div className="od-grid-2">
        <div className="od-card">
          <h2 className="od-card-title">Cliente</h2>
          <div className="od-field-grid">
            <Field label="Nombre" value={order.customer_name} />
            <Field label="Email"  value={order.customer_email} />
            <Field label="Teléfono" value={order.customer_phone} />
          </div>
        </div>
        <div className="od-card">
          <h2 className="od-card-title">Envío</h2>
          <div className="od-field-grid">
            <Field label="Dirección" value={order.shipping_address} />
            <Field label="Ciudad"    value={order.shipping_city} />
            <Field label="Departamento" value={order.shipping_department} />
          </div>
        </div>
      </div>

      {/* Tracking visible si existe */}
      {(order.tracking_carrier || order.tracking_number) && (
        <div className="od-tracking">
          <span className="od-tracking-icon">📦</span>
          <div>
            <p className="od-tracking-eyebrow">En tránsito</p>
            <p className="od-tracking-detail">
              <strong>{order.tracking_carrier || 'Operador'}</strong>
              {order.tracking_number && <span className="od-tracking-num">· {order.tracking_number}</span>}
            </p>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="od-card od-card--flush">
        <div className="od-card-head">
          <h2 className="od-card-title" style={{ margin: 0 }}>Productos ({order.order_items?.length || 0})</h2>
        </div>
        <div className="od-tablewrap">
          <table className="od-table">
            <tbody>
              {(order.order_items || []).map(item => (
                <tr key={item.id}>
                  <td>
                    <div className="od-item-name">{item.product_name}</div>
                    {item.selected_size && <div className="od-item-size">{item.selected_size}</div>}
                  </td>
                  <td className="od-item-qty">×{item.quantity}</td>
                  <td className="od-item-price">{formatCOP(Number(item.unit_price)) || '$0'}</td>
                  <td className="od-item-total">{formatCOP(Number(item.total_price)) || '$0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totales */}
      <div className="od-card">
        <div className="od-totals">
          <div className="od-total-row">
            <span>Subtotal</span>
            <span>{formatCOP(Number(order.subtotal)) || '$0'}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="od-total-row od-total-row--discount">
              <span>Descuento</span>
              <span>−{formatCOP(Number(order.discount))}</span>
            </div>
          )}
          <div className="od-total-row">
            <span>Envío</span>
            <span>{Number(order.shipping_cost) > 0 ? formatCOP(Number(order.shipping_cost)) : 'Gratis'}</span>
          </div>
          <div className="od-total-row od-total-row--grand">
            <span>Total</span>
            <span>{formatCOP(Number(order.total)) || '$0'}</span>
          </div>
        </div>
      </div>

      {/* Acciones admin (cambiar estado, tracking, notas, eliminar) */}
      <h2 className="od-section-title">Gestión de la orden</h2>
      <OrderActions order={order} />

      {/* Meta técnica */}
      <div className="od-meta">
        <Field label="Método de pago" value={order.payment_method} />
        <Field label="Wompi TX ID" value={order.wompi_tx_id} mono />
        <Field label="Última actualización" value={new Date(order.updated_at).toLocaleString('es-CO')} />
      </div>

      <OrderDetailStyles />
    </div>
  );
}

function OrderDetailStyles() {
  return (
    <style>{`
      .od {
        padding: 2.25rem 2.25rem 4rem;
        max-width: 1100px;
        margin: 0 auto;
        font-family: var(--font-montserrat), ui-sans-serif, system-ui, sans-serif;
        color: #2a1f15;
      }
      .od-back {
        font-size: 0.82rem;
        color: #8a6936;
        text-decoration: none;
        display: inline-block;
        margin-bottom: 1.1rem;
      }
      .od-back:hover { text-decoration: underline; }

      .od-titlebar {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 1.25rem;
        flex-wrap: wrap;
        gap: 12px;
      }
      .od-ref {
        font-size: 1.4rem;
        font-weight: 500;
        margin: 0;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        color: #1c1611;
      }
      .od-date {
        font-size: 0.85rem;
        color: rgba(28, 22, 17, 0.55);
        margin-top: 4px;
      }
      .od-status {
        padding: 6px 14px;
        border-radius: 99px;
        font-size: 0.78rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .od-sync { margin-bottom: 1.25rem; }

      .od-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1.25rem;
      }
      .od-card {
        background: #fff;
        border: 1px solid rgba(28, 22, 17, 0.08);
        border-radius: 14px;
        padding: 1.15rem;
        margin-bottom: 1rem;
      }
      .od-card--flush { padding: 0; overflow: hidden; }
      .od-card-head {
        padding: 0.85rem 1.15rem;
        border-bottom: 1px solid rgba(28, 22, 17, 0.08);
        background: rgba(28, 22, 17, 0.02);
      }
      .od-card-title {
        font-size: 0.78rem;
        text-transform: uppercase;
        color: rgba(28, 22, 17, 0.55);
        letter-spacing: 0.1em;
        margin: 0 0 0.9rem;
      }
      .od-field-grid { display: grid; gap: 0.75rem; }
      .od-field-label {
        font-size: 0.7rem;
        color: rgba(28, 22, 17, 0.5);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin: 0 0 4px;
      }
      .od-field-value {
        font-size: 0.92rem;
        color: #1c1611;
        margin: 0;
        word-break: break-word;
      }
      .od-field-value.is-mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.82rem;
      }

      .od-tracking {
        background: rgba(70, 110, 195, 0.09);
        border: 1px solid rgba(70, 110, 195, 0.3);
        border-radius: 12px;
        padding: 1rem 1.15rem;
        margin-bottom: 1.25rem;
        display: flex;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;
      }
      .od-tracking-icon { font-size: 24px; }
      .od-tracking-eyebrow {
        margin: 0;
        font-size: 0.78rem;
        color: #2c5394;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-weight: 600;
      }
      .od-tracking-detail { margin: 4px 0 0; font-size: 0.95rem; color: #1c1611; }
      .od-tracking-num { margin-left: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

      .od-tablewrap { overflow-x: auto; }
      .od-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
      .od-table tr { border-bottom: 1px solid rgba(28, 22, 17, 0.05); }
      .od-table tr:last-child { border-bottom: none; }
      .od-table td { padding: 0.85rem 1.15rem; }
      .od-item-name { font-weight: 500; color: #1c1611; }
      .od-item-size { font-size: 0.78rem; color: rgba(28, 22, 17, 0.55); }
      .od-item-qty { text-align: center; color: rgba(28, 22, 17, 0.55); font-size: 0.85rem; white-space: nowrap; }
      .od-item-price { text-align: right; white-space: nowrap; color: #2a1f15; }
      .od-item-total { text-align: right; font-weight: 600; white-space: nowrap; color: #1c1611; }

      .od-totals { display: grid; gap: 8px; max-width: 320px; margin-left: auto; }
      .od-total-row { display: flex; justify-content: space-between; font-size: 0.88rem; color: rgba(28, 22, 17, 0.55); }
      .od-total-row--discount { color: #1f6b48; }
      .od-total-row--grand {
        font-size: 1.05rem;
        font-weight: 600;
        color: #1c1611;
        padding-top: 8px;
        border-top: 1px solid rgba(28, 22, 17, 0.1);
      }

      .od-section-title {
        font-size: 0.92rem;
        font-weight: 500;
        color: #1c1611;
        margin: 1.5rem 0 0.75rem;
      }

      .od-meta {
        margin-top: 1.5rem;
        padding: 1rem 1.15rem;
        background: rgba(28, 22, 17, 0.02);
        border: 1px solid rgba(28, 22, 17, 0.08);
        border-radius: 12px;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 14px;
        font-size: 0.78rem;
      }

      @media (max-width: 768px) {
        .od-grid-2 { grid-template-columns: 1fr; }
        .od-meta { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}
