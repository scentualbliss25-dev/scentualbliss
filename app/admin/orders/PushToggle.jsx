'use client';
import { useState, useEffect } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Url = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Url);
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

export function PushToggle() {
  const [status, setStatus] = useState('loading'); // loading | unsupported | denied | off | on
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Todo el chequeo dentro de try/catch porque hay browsers donde algunas
    // de estas APIs lanzan SecurityError o ReferenceError (Brave, iOS Safari
    // en algunas versiones, modo incógnito en Firefox, etc.).
    try {
      if (typeof window === 'undefined') return;
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('unsupported');
        return;
      }
      if (typeof Notification === 'undefined') {
        setStatus('unsupported');
        return;
      }
      if (!VAPID_PUBLIC_KEY) {
        setStatus('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        setStatus('denied');
        return;
      }

      navigator.serviceWorker.ready.then(async (reg) => {
        try {
          const sub = await reg.pushManager.getSubscription();
          setStatus(sub ? 'on' : 'off');
        } catch {
          setStatus('off');
        }
      }).catch(() => setStatus('off'));
    } catch (err) {
      console.warn('[PushToggle] no soportado:', err?.message);
      setStatus('unsupported');
    }
  }, []);

  const handleSubscribe = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error('Falló registro en servidor');
      setStatus('on');
    } catch (err) {
      console.error('[push subscribe]', err);
      alert('No se pudo activar: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUnsubscribe = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus('off');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'loading') return null;

  if (status === 'unsupported') {
    return (
      <div style={pillStyle('#6b7280', '#f3f4f6')}>
        🔕 Notificaciones no soportadas en este navegador
      </div>
    );
  }
  if (status === 'denied') {
    return (
      <div style={pillStyle('#b91c1c', '#fee2e2')}>
        🚫 Notificaciones bloqueadas — habilítalas en ajustes del navegador
      </div>
    );
  }

  return (
    <button
      onClick={status === 'on' ? handleUnsubscribe : handleSubscribe}
      disabled={busy}
      style={pillStyle(
        status === 'on' ? '#059669' : '#1f2937',
        status === 'on' ? '#d1fae5' : '#f9fafb',
        true
      )}
    >
      {busy ? '...' : status === 'on' ? '🔔 Notificaciones activas (clic para desactivar)' : '🔕 Activar notificaciones push'}
    </button>
  );
}

function pillStyle(color, bg, clickable) {
  return {
    background: bg,
    color,
    padding: '8px 14px',
    borderRadius: 8,
    fontSize: '.82rem',
    fontWeight: 600,
    border: `1px solid ${color}33`,
    cursor: clickable ? 'pointer' : 'default',
  };
}
