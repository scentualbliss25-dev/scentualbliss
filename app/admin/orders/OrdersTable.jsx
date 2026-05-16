'use client';
import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { formatCOP } from '@/lib/format';
import { bulkDeleteOrdersAction } from './_actions';

const STATUS_STYLES = {
  approved: { bg: '#10b98122', color: '#059669', label: 'Aprobada' },
  pending:  { bg: '#f59e0b22', color: '#b45309', label: 'Pendiente' },
  declined: { bg: '#ef444422', color: '#b91c1c', label: 'Rechazada' },
  voided:   { bg: '#6b728022', color: '#374151', label: 'Anulada' },
  error:    { bg: '#ef444422', color: '#b91c1c', label: 'Error' },
};

const FILTERS = [
  { key: 'all',      label: 'Todas' },
  { key: 'approved', label: 'Aprobadas' },
  { key: 'pending',  label: 'Pendientes' },
  { key: 'declined', label: 'Rechazadas' },
];

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { bg: '#e5e7eb', color: '#374151', label: status || '?' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: 99,
      fontSize: '.7rem', fontWeight: 600,
      letterSpacing: '.04em', textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
}

function buildWhatsAppLink(order) {
  const phone = (order.customer_phone || '').replace(/\D/g, '');
  if (!phone) return null;
  const ref = order.reference || '';
  const name = order.customer_name?.split(' ')[0] || '';
  const text = `Hola ${name}! 🌸 Te escribo de ScentualBliss sobre tu pedido ${ref}.`;
  const phoneWithCountry = phone.length === 10 ? '57' + phone : phone;
  return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
}

function exportToCSV(orders) {
  const headers = ['Referencia', 'Estado', 'Cliente', 'Email', 'Teléfono', 'Ciudad', 'Items', 'Total', 'Fecha'];
  const rows = orders.map(o => [
    o.reference,
    o.status,
    o.customer_name,
    o.customer_email,
    o.customer_phone,
    o.shipping_city,
    o.order_items?.length || 0,
    o.total,
    new Date(o.created_at).toISOString(),
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ordenes-scentualbliss-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function OrdersTable({ orders }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(o => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (!q) return true;
      return [o.reference, o.customer_name, o.customer_email, o.customer_phone, o.shipping_city]
        .some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [orders, search, filter]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(o => selected.has(o.id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allFilteredSelected) {
      const next = new Set(selected);
      filtered.forEach(o => next.delete(o.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach(o => next.add(o.id));
      setSelected(next);
    }
  };

  const toggleOne = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleBulkDelete = () => {
    if (!confirm(`¿Eliminar ${selected.size} orden(es)? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const r = await bulkDeleteOrdersAction([...selected]);
      if (r.ok) setSelected(new Set());
      else alert('Error: ' + r.error);
    });
  };

  // Stats sobre el set FILTRADO (más útil al filtrar)
  const stats = useMemo(() => ({
    total: filtered.length,
    approved: filtered.filter(o => o.status === 'approved').length,
    pending: filtered.filter(o => o.status === 'pending').length,
    revenue: filtered.filter(o => o.status === 'approved').reduce((s, o) => s + Number(o.total || 0), 0),
    avgTicket: 0,
  }), [filtered]);
  stats.avgTicket = stats.approved > 0 ? stats.revenue / stats.approved : 0;

  return (
    <>
      {/* Stats */}
      <div className="ot-stats">
        {[
          { label: 'Órdenes', value: stats.total, color: '#1f2937' },
          { label: 'Aprobadas', value: stats.approved, color: '#059669' },
          { label: 'Pendientes', value: stats.pending, color: '#b45309' },
          { label: 'Ingresos', value: formatCOP(stats.revenue) || '$0', color: '#1f2937' },
          { label: 'Ticket promedio', value: formatCOP(stats.avgTicket) || '$0', color: '#1f2937' },
        ].map(s => (
          <div key={s.label} className="ot-stat">
            <p className="ot-stat-label">{s.label}</p>
            <p className="ot-stat-value" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros + búsqueda */}
      <div className="ot-toolbar">
        <div className="ot-tabs">
          {FILTERS.map(f => {
            const count = f.key === 'all' ? orders.length : orders.filter(o => o.status === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`ot-tab ${filter === f.key ? 'is-active' : ''}`}
              >
                {f.label} <span className="ot-tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="ot-search">
          <input
            type="search"
            placeholder="Buscar por referencia, email, nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="ot-search-input"
          />
          <button onClick={() => exportToCSV(filtered)} className="ot-export-btn">
            ⬇ Exportar CSV
          </button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {someSelected && (
        <div className="ot-bulkbar">
          <span><strong>{selected.size}</strong> seleccionada{selected.size !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setSelected(new Set())} className="ot-bulk-btn ot-bulk-cancel">
              Cancelar
            </button>
            <button onClick={handleBulkDelete} disabled={isPending} className="ot-bulk-btn ot-bulk-delete">
              {isPending ? 'Eliminando...' : '🗑 Eliminar seleccionadas'}
            </button>
          </div>
        </div>
      )}

      {/* Tabla (desktop) */}
      {filtered.length === 0 ? (
        <div className="ot-empty">
          {search || filter !== 'all'
            ? 'Sin resultados con esos filtros.'
            : 'Aún no hay órdenes. Cuando alguien complete un checkout, aparecerá acá.'}
        </div>
      ) : (
        <>
          <div className="ot-table-wrap">
            <table className="ot-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAll}
                      aria-label="Seleccionar todas"
                    />
                  </th>
                  <th>Referencia</th>
                  <th>Cliente</th>
                  <th style={{ textAlign: 'center' }}>Items</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'right' }}>Fecha</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => {
                  const wa = buildWhatsAppLink(o);
                  return (
                    <tr key={o.id} className={selected.has(o.id) ? 'is-selected' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(o.id)}
                          onChange={() => toggleOne(o.id)}
                          aria-label={`Seleccionar ${o.reference}`}
                        />
                      </td>
                      <td>
                        <Link href={`/admin/orders/${o.id}`} className="ot-ref">{o.reference}</Link>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{o.customer_name || '—'}</div>
                        <div style={{ fontSize: '.78rem', color: '#6b7280' }}>{o.customer_email}</div>
                      </td>
                      <td style={{ textAlign: 'center', color: '#6b7280' }}>{o.order_items?.length || 0}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCOP(Number(o.total)) || '$0'}</td>
                      <td style={{ textAlign: 'center' }}><StatusBadge status={o.status} /></td>
                      <td style={{ textAlign: 'right', color: '#6b7280', fontSize: '.78rem' }}>
                        {new Date(o.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          {wa && (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ot-action ot-action-wa"
                              title="WhatsApp al cliente"
                            >💬</a>
                          )}
                          <Link href={`/admin/orders/${o.id}`} className="ot-action ot-action-view" title="Ver detalle">→</Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards (mobile) */}
          <div className="ot-cards">
            {filtered.map(o => {
              const wa = buildWhatsAppLink(o);
              return (
                <div key={o.id} className={`ot-card ${selected.has(o.id) ? 'is-selected' : ''}`}>
                  <div className="ot-card-header">
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => toggleOne(o.id)}
                    />
                    <Link href={`/admin/orders/${o.id}`} className="ot-ref">{o.reference}</Link>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="ot-card-body">
                    <div><strong>{o.customer_name}</strong></div>
                    <div style={{ fontSize: '.82rem', color: '#6b7280' }}>{o.customer_email}</div>
                    <div style={{ fontSize: '.82rem', color: '#6b7280' }}>{o.shipping_city}</div>
                  </div>
                  <div className="ot-card-footer">
                    <span style={{ fontWeight: 700 }}>{formatCOP(Number(o.total)) || '$0'}</span>
                    <span style={{ fontSize: '.74rem', color: '#9ca3af' }}>
                      {new Date(o.created_at).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                  <div className="ot-card-actions">
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className="ot-card-action">
                        💬 WhatsApp
                      </a>
                    )}
                    <Link href={`/admin/orders/${o.id}`} className="ot-card-action ot-card-action-primary">
                      Ver detalle →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <style>{`
        .ot-stats {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-bottom: 24px;
        }
        .ot-stat {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 14px;
        }
        .ot-stat-label {
          font-size: .66rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: .06em;
          margin: 0 0 6px;
        }
        .ot-stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
        }

        .ot-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .ot-tabs {
          display: inline-flex;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 4px;
          gap: 2px;
        }
        .ot-tab {
          background: transparent;
          border: 0;
          padding: 7px 14px;
          font-size: .82rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          border-radius: 6px;
          transition: all .15s ease;
        }
        .ot-tab:hover { color: #1f2937; }
        .ot-tab.is-active {
          background: #1f2937;
          color: #fff;
        }
        .ot-tab-count {
          background: rgba(255,255,255,.15);
          padding: 1px 7px;
          border-radius: 99px;
          font-size: .7rem;
          margin-left: 4px;
        }
        .ot-tab:not(.is-active) .ot-tab-count {
          background: #f3f4f6;
          color: #6b7280;
        }

        .ot-search { display: flex; gap: 8px; }
        .ot-search-input {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: .85rem;
          min-width: 260px;
        }
        .ot-search-input:focus {
          outline: 2px solid #c9a96e;
          outline-offset: -1px;
        }
        .ot-export-btn {
          padding: 8px 14px;
          background: #fff;
          color: #1f2937;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: .82rem;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
        }
        .ot-export-btn:hover { background: #f9fafb; }

        .ot-bulkbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #1f2937;
          color: #fff;
          padding: 10px 16px;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: .85rem;
        }
        .ot-bulk-btn {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: .8rem;
          font-weight: 500;
          cursor: pointer;
          border: 0;
        }
        .ot-bulk-cancel { background: rgba(255,255,255,.1); color: #fff; }
        .ot-bulk-delete { background: #ef4444; color: #fff; }
        .ot-bulk-delete:disabled { opacity: .6; cursor: wait; }

        .ot-empty {
          padding: 80px 20px;
          text-align: center;
          background: #f9fafb;
          border-radius: 8px;
          color: #6b7280;
          font-size: .9rem;
        }

        .ot-table-wrap {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          overflow-x: auto;
        }
        .ot-table {
          width: 100%;
          border-collapse: collapse;
          font-size: .85rem;
        }
        .ot-table thead tr {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }
        .ot-table th {
          text-align: left;
          padding: 12px 16px;
          font-weight: 600;
          font-size: .7rem;
          text-transform: uppercase;
          letter-spacing: .06em;
          color: #6b7280;
          white-space: nowrap;
        }
        .ot-table tbody tr {
          border-bottom: 1px solid #f3f4f6;
          transition: background .15s ease;
        }
        .ot-table tbody tr:hover { background: #fafafa; }
        .ot-table tbody tr.is-selected { background: #fef3c7; }
        .ot-table td {
          padding: 14px 16px;
          vertical-align: middle;
        }
        .ot-ref {
          color: #2563eb;
          text-decoration: none;
          font-family: ui-monospace, monospace;
          font-size: .78rem;
          font-weight: 500;
        }
        .ot-ref:hover { text-decoration: underline; }

        .ot-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 6px;
          background: #f3f4f6;
          color: #1f2937;
          text-decoration: none;
          font-size: .9rem;
          transition: all .15s ease;
        }
        .ot-action:hover { background: #e5e7eb; }
        .ot-action-wa:hover { background: #25D366; color: #fff; }

        .ot-cards { display: none; }

        @media (max-width: 1024px) {
          .ot-stats { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 768px) {
          .ot-stats { grid-template-columns: repeat(2, 1fr); }
          .ot-stat-value { font-size: 1.1rem; }
          .ot-toolbar { flex-direction: column; align-items: stretch; }
          .ot-tabs {
            overflow-x: auto;
            justify-content: flex-start;
            white-space: nowrap;
          }
          .ot-search { flex-direction: column; }
          .ot-search-input { min-width: 0; width: 100%; }
          .ot-table-wrap { display: none; }
          .ot-cards { display: flex; flex-direction: column; gap: 10px; }
          .ot-card {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 14px;
          }
          .ot-card.is-selected { background: #fef3c7; border-color: #f59e0b; }
          .ot-card-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
          }
          .ot-card-header .ot-ref { flex: 1; }
          .ot-card-body { margin-bottom: 10px; font-size: .9rem; }
          .ot-card-footer {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-top: 1px solid #f3f4f6;
            margin-bottom: 10px;
            font-size: .92rem;
          }
          .ot-card-actions { display: flex; gap: 8px; }
          .ot-card-action {
            flex: 1;
            padding: 8px;
            text-align: center;
            background: #f3f4f6;
            color: #1f2937;
            text-decoration: none;
            border-radius: 6px;
            font-size: .82rem;
            font-weight: 500;
          }
          .ot-card-action-primary {
            background: #1f2937;
            color: #fff;
          }
        }
      `}</style>
    </>
  );
}
