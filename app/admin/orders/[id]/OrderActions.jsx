'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderAction, deleteOrderAction, resendOrderNotificationsAction } from '../_actions';

const STATUS_OPTIONS = [
  { value: 'pending',  label: 'Pendiente',   color: '#b45309' },
  { value: 'approved', label: 'Aprobada',    color: '#059669' },
  { value: 'declined', label: 'Rechazada',   color: '#b91c1c' },
  { value: 'voided',   label: 'Anulada',     color: '#374151' },
  { value: 'shipped',  label: 'Enviada',     color: '#1d4ed8' },
  { value: 'delivered',label: 'Entregada',   color: '#047857' },
];

const CARRIERS = ['Servientrega', 'Coordinadora', 'Interrapidísimo', 'Envia', 'Domina', 'Otro'];

function buildWhatsAppLink(order, type = 'general') {
  const phone = (order.customer_phone || '').replace(/\D/g, '');
  if (!phone) return null;
  const phoneWithCountry = phone.length === 10 ? '57' + phone : phone;
  const name = order.customer_name?.split(' ')[0] || '';

  const templates = {
    general: `Hola ${name}! 🌸 Te escribo de ScentualBliss sobre tu pedido ${order.reference}.`,
    shipped: `Hola ${name}! 🎉 Tu pedido ${order.reference} de ScentualBliss ya está en camino. ${order.tracking_carrier ? `Guía ${order.tracking_carrier}: ${order.tracking_number}` : ''}`,
    delivered: `Hola ${name}! 🌸 Esperamos que estés disfrutando tu pedido ${order.reference}. ¿Nos dejarías una reseña?`,
  };
  return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(templates[type] || templates.general)}`;
}

export function OrderActions({ order }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(order.status || 'pending');
  const [notes, setNotes] = useState(order.admin_notes || '');
  const [carrier, setCarrier] = useState(order.tracking_carrier || '');
  const [trackNum, setTrackNum] = useState(order.tracking_number || '');
  const [savedMsg, setSavedMsg] = useState(null);

  const handleSave = (updates, label) => {
    startTransition(async () => {
      const r = await updateOrderAction(order.id, updates);
      if (r.ok) {
        setSavedMsg({ type: 'success', text: r.warning || `✓ ${label} actualizado` });
        setTimeout(() => setSavedMsg(null), 3500);
      } else {
        setSavedMsg({ type: 'error', text: '✗ ' + r.error });
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`¿Eliminar la orden ${order.reference}? Esta acción es permanente.`)) return;
    if (!confirm('Última confirmación: ¿Seguro?')) return;
    startTransition(async () => {
      const r = await deleteOrderAction(order.id);
      if (r.ok) router.push('/admin/orders');
      else alert('Error: ' + r.error);
    });
  };

  const [resendBusy, setResendBusy] = useState(null); // 'admin' | 'customer' | 'both' | null
  const handleResend = (target) => {
    setResendBusy(target);
    startTransition(async () => {
      const r = await resendOrderNotificationsAction(order.id, target);
      if (r.ok) {
        const labels = { admin: 'al admin', customer: 'al cliente', both: 'al admin y al cliente' };
        setSavedMsg({ type: 'success', text: `✓ Email reenviado ${labels[target]}` });
      } else {
        setSavedMsg({ type: 'error', text: '✗ ' + (r.error || 'Falló el reenvío') });
      }
      setResendBusy(null);
      setTimeout(() => setSavedMsg(null), 4500);
    });
  };

  const waGeneral = buildWhatsAppLink(order, 'general');
  const waShipped = buildWhatsAppLink(order, 'shipped');

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Acciones rápidas */}
      <div className="oa-section">
        <h3 className="oa-title">Acciones rápidas</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {waGeneral && (
            <a href={waGeneral} target="_blank" rel="noopener noreferrer" className="oa-btn oa-btn-wa">
              💬 WhatsApp al cliente
            </a>
          )}
          {waShipped && carrier && trackNum && (
            <a href={waShipped} target="_blank" rel="noopener noreferrer" className="oa-btn oa-btn-wa-shipped">
              📦 Enviar tracking por WhatsApp
            </a>
          )}
          <button onClick={handleDelete} disabled={isPending} className="oa-btn oa-btn-delete">
            🗑 Eliminar orden
          </button>
        </div>
      </div>

      {/* Reenviar notificaciones por email */}
      <div className="oa-section">
        <h3 className="oa-title">📧 Reenviar emails</h3>
        <p style={{ margin: '0 0 12px', fontSize: '.78rem', color: '#6b7280', lineHeight: 1.5 }}>
          Útil si la orden quedó sin notificación (ej: Resend no estaba configurado cuando llegó el webhook).
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => handleResend('customer')}
            disabled={isPending || !order.customer_email}
            className="oa-btn oa-btn-resend"
            title={!order.customer_email ? 'La orden no tiene customer_email' : `Enviar a ${order.customer_email}`}
          >
            {resendBusy === 'customer' ? 'Enviando…' : '👤 Reenviar al cliente'}
          </button>
          <button
            onClick={() => handleResend('admin')}
            disabled={isPending}
            className="oa-btn oa-btn-resend"
          >
            {resendBusy === 'admin' ? 'Enviando…' : '🔔 Reenviar al admin'}
          </button>
          <button
            onClick={() => handleResend('both')}
            disabled={isPending || !order.customer_email}
            className="oa-btn oa-btn-primary"
          >
            {resendBusy === 'both' ? 'Enviando…' : 'Reenviar ambos'}
          </button>
        </div>
      </div>

      {/* Cambiar estado */}
      <div className="oa-section">
        <h3 className="oa-title">Estado de la orden</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="oa-select"
            disabled={isPending}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={() => handleSave({ status }, 'Estado')}
            disabled={isPending || status === order.status}
            className="oa-btn oa-btn-primary"
          >
            {isPending ? 'Guardando...' : 'Guardar estado'}
          </button>
        </div>
      </div>

      {/* Tracking */}
      <div className="oa-section">
        <h3 className="oa-title">📦 Tracking de envío</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 10 }}>
          <select
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            className="oa-select"
            disabled={isPending}
          >
            <option value="">— Operador —</option>
            {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="text"
            placeholder="Número de guía"
            value={trackNum}
            onChange={(e) => setTrackNum(e.target.value)}
            className="oa-input"
            disabled={isPending}
          />
        </div>
        <button
          onClick={() => handleSave({ tracking_carrier: carrier, tracking_number: trackNum }, 'Tracking')}
          disabled={isPending}
          className="oa-btn oa-btn-primary"
        >
          {isPending ? 'Guardando...' : 'Guardar tracking'}
        </button>
      </div>

      {/* Notas internas */}
      <div className="oa-section">
        <h3 className="oa-title">📝 Notas internas (privadas)</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observaciones, mensajes del cliente, recordatorios..."
          rows={4}
          className="oa-textarea"
          disabled={isPending}
        />
        <button
          onClick={() => handleSave({ admin_notes: notes }, 'Notas')}
          disabled={isPending || notes === (order.admin_notes || '')}
          className="oa-btn oa-btn-primary"
          style={{ marginTop: 8 }}
        >
          {isPending ? 'Guardando...' : 'Guardar notas'}
        </button>
      </div>

      {savedMsg && (
        <div className={`oa-msg ${savedMsg.type}`}>{savedMsg.text}</div>
      )}

      <style>{`
        .oa-section {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 18px;
        }
        .oa-title {
          font-size: .78rem;
          text-transform: uppercase;
          color: #6b7280;
          letter-spacing: .08em;
          margin: 0 0 14px;
        }
        .oa-btn {
          padding: 8px 14px;
          border-radius: 6px;
          font-size: .82rem;
          font-weight: 500;
          cursor: pointer;
          border: 0;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .oa-btn:disabled { opacity: .55; cursor: not-allowed; }
        .oa-btn-primary { background: #1f2937; color: #fff; }
        .oa-btn-primary:hover:not(:disabled) { background: #111827; }
        .oa-btn-wa { background: #25D366; color: #fff; }
        .oa-btn-wa:hover { background: #1ea655; }
        .oa-btn-wa-shipped { background: #1d4ed8; color: #fff; }
        .oa-btn-delete { background: #ef4444; color: #fff; }
        .oa-btn-delete:hover:not(:disabled) { background: #dc2626; }
        .oa-btn-resend {
          background: #fff;
          color: #1f2937;
          border: 1px solid #d1d5db;
        }
        .oa-btn-resend:hover:not(:disabled) {
          background: #faf6ee;
          border-color: #c9a96e;
          color: #6b4f24;
        }
        .oa-select, .oa-input, .oa-textarea {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: .85rem;
          font-family: inherit;
          background: #fff;
          color: #1f2937;
        }
        .oa-textarea {
          width: 100%;
          resize: vertical;
          min-height: 80px;
        }
        .oa-select:focus, .oa-input:focus, .oa-textarea:focus {
          outline: 2px solid #c9a96e;
          outline-offset: -1px;
        }
        .oa-msg {
          padding: 10px 14px;
          border-radius: 6px;
          font-size: .85rem;
          font-weight: 500;
        }
        .oa-msg.success { background: #d1fae5; color: #047857; }
        .oa-msg.error { background: #fee2e2; color: #b91c1c; }
      `}</style>
    </div>
  );
}
