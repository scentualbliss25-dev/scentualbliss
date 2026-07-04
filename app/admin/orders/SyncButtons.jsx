'use client';
import { useState, useTransition } from 'react';
import { syncOrderAction, syncAllPendingAction } from './_actions';

export function SyncOrderButton({ orderId }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState(null);

  const onClick = () => {
    setMsg(null);
    startTransition(async () => {
      const r = await syncOrderAction(orderId);
      setMsg(r);
    });
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={onClick}
        disabled={isPending}
        style={{
          padding: '8px 14px',
          background: 'linear-gradient(135deg, #c09a5a, #8a6936)',
          color: '#1c1611',
          border: 0,
          borderRadius: 8,
          fontSize: '.82rem',
          fontWeight: 500,
          fontFamily: 'inherit',
          cursor: isPending ? 'wait' : 'pointer',
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? 'Sincronizando…' : 'Sincronizar con Wompi'}
      </button>
      {msg && (
        <span style={{ fontSize: '.82rem', color: msg.ok ? '#1f6b48' : '#8a2a2a' }}>
          {msg.ok
            ? `${msg.oldStatus} → ${msg.newStatus}`
            : `✗ ${msg.error}`}
        </span>
      )}
    </div>
  );
}

export function SyncAllPendingButton() {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState(null);

  const onClick = () => {
    setMsg(null);
    startTransition(async () => {
      const r = await syncAllPendingAction();
      setMsg(r);
    });
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={onClick}
        disabled={isPending}
        style={{
          padding: '7px 13px',
          background: 'transparent',
          color: 'rgba(28, 22, 17, 0.65)',
          border: '1px solid rgba(28, 22, 17, 0.15)',
          borderRadius: 8,
          fontSize: '.78rem',
          fontWeight: 500,
          fontFamily: 'inherit',
          cursor: isPending ? 'wait' : 'pointer',
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? 'Sincronizando…' : '↻ Sincronizar pendientes'}
      </button>
      {msg && (
        <div style={{ fontSize: '.78rem', color: msg.ok ? '#1c1611' : '#8a2a2a' }}>
          {msg.ok ? (
            <details open>
              <summary style={{ cursor: 'pointer' }}>{msg.synced} consultadas</summary>
              <ul style={{ margin: '6px 0 0 0', padding: '0 0 0 16px' }}>
                {msg.results.map((r, i) => (
                  <li key={i} style={{ fontFamily: 'ui-monospace, monospace', fontSize: '.74rem' }}>
                    <span>{r.ref}</span> → <strong>{r.status}</strong>
                  </li>
                ))}
              </ul>
            </details>
          ) : `✗ ${msg.error}`}
        </div>
      )}
    </div>
  );
}
