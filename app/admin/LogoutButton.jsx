'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Botón de logout discreto que se monta una sola vez en el layout admin.
 * Se auto-oculta en /admin/login (no hay sesión que cerrar).
 *
 * Cuando construyamos el sidebar definitivo, este botón se moverá ahí —
 * por ahora lo dejamos flotante para tener logout funcional desde el día 1.
 */
export default function LogoutButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (pathname === '/admin/login') return null;

  async function onClick() {
    setBusy(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="admin-logout-fab"
        aria-label="Cerrar sesión admin"
      >
        {busy ? 'Saliendo…' : 'Cerrar sesión'}
      </button>
      <style jsx>{`
        .admin-logout-fab {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 1000;
          padding: 0.5rem 0.85rem;
          background: rgba(28, 22, 17, 0.85);
          color: #f3ead7;
          border: 1px solid rgba(192, 154, 90, 0.3);
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 500;
          letter-spacing: 0.05em;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: background 0.2s, border-color 0.2s;
          font-family: var(--font-montserrat), system-ui, sans-serif;
        }
        .admin-logout-fab:hover:not(:disabled) {
          background: rgba(28, 22, 17, 0.95);
          border-color: rgba(192, 154, 90, 0.55);
        }
        .admin-logout-fab:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
