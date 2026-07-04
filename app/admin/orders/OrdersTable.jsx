'use client';
import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { formatCOP } from '@/lib/format';
import { bulkDeleteOrdersAction } from './_actions';

const STATUS_STYLES = {
  approved:  { bg: 'rgba(34, 145, 99, 0.13)',  color: '#1f6b48', label: 'Aprobada' },
  pending:   { bg: 'rgba(196, 107, 30, 0.14)', color: '#8d4a17', label: 'Pendiente' },
  declined:  { bg: 'rgba(170, 50, 50, 0.13)',  color: '#8a2a2a', label: 'Rechazada' },
  voided:    { bg: 'rgba(28, 22, 17, 0.08)',   color: 'rgba(28, 22, 17, 0.65)', label: 'Anulada' },
  error:     { bg: 'rgba(170, 50, 50, 0.13)',  color: '#8a2a2a', label: 'Error' },
  shipped:   { bg: 'rgba(70, 110, 195, 0.13)', color: '#2c5394', label: 'Enviada' },
  delivered: { bg: 'rgba(34, 145, 99, 0.13)',  color: '#1f6b48', label: 'Entregada' },
};

const FILTERS = [
  { key: 'all',      label: 'Todas' },
  { key: 'approved', label: 'Aprobadas' },
  { key: 'pending',  label: 'Pendientes' },
  { key: 'declined', label: 'Rechazadas' },
];

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { bg: 'rgba(28, 22, 17, 0.08)', color: 'rgba(28, 22, 17, 0.6)', label: status || '?' };
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
          { label: 'Órdenes', value: stats.total, color: '#1c1611' },
          { label: 'Aprobadas', value: stats.approved, color: '#1f6b48' },
          { label: 'Pendientes', value: stats.pending, color: '#8d4a17' },
          { label: 'Ingresos', value: formatCOP(stats.revenue) || '$0', color: '#8a6936' },
          { label: 'Ticket promedio', value: formatCOP(stats.avgTicket) || '$0', color: '#1c1611' },
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
                        <div style={{ fontSize: '.78rem', color: 'rgba(28, 22, 17, 0.55)' }}>{o.customer_email}</div>
                      </td>
                      <td style={{ textAlign: 'center', color: 'rgba(28, 22, 17, 0.55)' }}>{o.order_items?.length || 0}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCOP(Number(o.total)) || '$0'}</td>
                      <td style={{ textAlign: 'center' }}><StatusBadge status={o.status} /></td>
                      <td style={{ textAlign: 'right', color: 'rgba(28, 22, 17, 0.55)', fontSize: '.78rem' }}>
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
                    <div style={{ fontSize: '.82rem', color: 'rgba(28, 22, 17, 0.55)' }}>{o.customer_email}</div>
                    <div style={{ fontSize: '.82rem', color: 'rgba(28, 22, 17, 0.55)' }}>{o.shipping_city}</div>
                  </div>
                  <div className="ot-card-footer">
                    <span style={{ fontWeight: 700, color: '#1c1611' }}>{formatCOP(Number(o.total)) || '$0'}</span>
                    <span style={{ fontSize: '.74rem', color: 'rgba(28, 22, 17, 0.4)' }}>
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
          border: 1px solid rgba(28, 22, 17, 0.08);
          border-radius: 12px;
          padding: 14px 16px;
        }
        .ot-stat-label {
          font-size: .66rem;
          color: rgba(28, 22, 17, 0.5);
          text-transform: uppercase;
          letter-spacing: .12em;
          margin: 0 0 6px;
        }
        .ot-stat-value {
          font-size: 1.25rem;
          font-weight: 500;
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
          border: 1px solid rgba(28, 22, 17, 0.08);
          border-radius: 9px;
          padding: 4px;
          gap: 2px;
        }
        .ot-tab {
          background: transparent;
          border: 0;
          padding: 7px 14px;
          font-size: .82rem;
          font-weight: 500;
          color: rgba(28, 22, 17, 0.55);
          cursor: pointer;
          border-radius: 7px;
          font-family: inherit;
          transition: all .15s ease;
        }
        .ot-tab:hover { color: #1c1611; }
        .ot-tab.is-active {
          background: linear-gradient(135deg, #c09a5a, #8a6936);
          color: #1c1611;
        }
        .ot-tab-count {
          background: rgba(255,255,255,.3);
          padding: 1px 7px;
          border-radius: 99px;
          font-size: .7rem;
          margin-left: 4px;
        }
        .ot-tab:not(.is-active) .ot-tab-count {
          background: rgba(28, 22, 17, 0.06);
          color: rgba(28, 22, 17, 0.55);
        }

        .ot-search { display: flex; gap: 8px; }
        .ot-search-input {
          padding: 8px 12px;
          border: 1px solid rgba(28, 22, 17, 0.15);
          border-radius: 8px;
          font-size: .85rem;
          min-width: 260px;
          font-family: inherit;
          color: #1c1611;
        }
        .ot-search-input:focus {
          outline: none;
          border-color: rgba(192, 154, 90, 0.55);
          box-shadow: 0 0 0 3px rgba(192, 154, 90, 0.12);
        }
        .ot-export-btn {
          padding: 8px 14px;
          background: transparent;
          color: rgba(28, 22, 17, 0.65);
          border: 1px solid rgba(28, 22, 17, 0.15);
          border-radius: 8px;
          font-size: .82rem;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .ot-export-btn:hover { background: rgba(28, 22, 17, 0.04); border-color: rgba(28, 22, 17, 0.25); color: #1c1611; }

        .ot-bulkbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #1c1611;
          color: #f3ead7;
          padding: 10px 16px;
          border-radius: 10px;
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
          font-family: inherit;
        }
        .ot-bulk-cancel { background: rgba(255,255,255,.1); color: #f3ead7; }
        .ot-bulk-delete { background: #aa3232; color: #fff; }
        .ot-bulk-delete:disabled { opacity: .6; cursor: wait; }

        .ot-empty {
          padding: 80px 20px;
          text-align: center;
          background: #fff;
          border: 1px solid rgba(28, 22, 17, 0.08);
          border-radius: 12px;
          color: rgba(28, 22, 17, 0.5);
          font-size: .9rem;
        }

        .ot-table-wrap {
          background: #fff;
          border: 1px solid rgba(28, 22, 17, 0.08);
          border-radius: 14px;
          overflow: hidden;
          overflow-x: auto;
        }
        .ot-table {
          width: 100%;
          border-collapse: collapse;
          font-size: .85rem;
        }
        .ot-table thead tr {
          background: rgba(28, 22, 17, 0.02);
          border-bottom: 1px solid rgba(28, 22, 17, 0.07);
        }
        .ot-table th {
          text-align: left;
          padding: 0.95rem 1rem;
          font-weight: 500;
          font-size: .7rem;
          text-transform: uppercase;
          letter-spacing: .12em;
          color: rgba(28, 22, 17, 0.55);
          white-space: nowrap;
        }
        .ot-table tbody tr {
          border-bottom: 1px solid rgba(28, 22, 17, 0.05);
          transition: background .15s ease;
        }
        .ot-table tbody tr:last-child { border-bottom: none; }
        .ot-table tbody tr:hover { background: rgba(192, 154, 90, 0.045); }
        .ot-table tbody tr.is-selected { background: rgba(192, 154, 90, 0.14); }
        .ot-table td {
          padding: 0.85rem 1rem;
          vertical-align: middle;
          color: #2a1f15;
        }
        .ot-ref {
          color: #8a6936;
          text-decoration: none;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: .78rem;
          font-weight: 500;
        }
        .ot-ref:hover { color: #5d4724; text-decoration: underline; }

        .ot-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 7px;
          background: rgba(28, 22, 17, 0.05);
          color: #1c1611;
          text-decoration: none;
          font-size: .9rem;
          transition: all .15s ease;
        }
        .ot-action:hover { background: rgba(28, 22, 17, 0.1); }
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
            border: 1px solid rgba(28, 22, 17, 0.08);
            border-radius: 12px;
            padding: 14px;
          }
          .ot-card.is-selected { background: rgba(192, 154, 90, 0.14); border-color: rgba(192, 154, 90, 0.5); }
          .ot-card-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
          }
          .ot-card-header .ot-ref { flex: 1; }
          .ot-card-body { margin-bottom: 10px; font-size: .9rem; color: #2a1f15; }
          .ot-card-footer {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-top: 1px solid rgba(28, 22, 17, 0.06);
            margin-bottom: 10px;
            font-size: .92rem;
          }
          .ot-card-actions { display: flex; gap: 8px; }
          .ot-card-action {
            flex: 1;
            padding: 8px;
            text-align: center;
            background: rgba(28, 22, 17, 0.05);
            color: #1c1611;
            text-decoration: none;
            border-radius: 7px;
            font-size: .82rem;
            font-weight: 500;
          }
          .ot-card-action-primary {
            background: linear-gradient(135deg, #c09a5a, #8a6936);
            color: #1c1611;
          }
        }
      `}</style>
    </>
  );
}
