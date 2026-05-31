'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Toast efímero que aparece tras una acción exitosa (create/update/delete).
 * Se cierra solo en 3.5s y limpia el query param para que no reaparezca al
 * refrescar.
 */
export default function UpdatedToast() {
  const sp = useSearchParams();
  const router = useRouter();
  const [show, setShow] = useState(false);

  const created = sp.get('created');
  const updated = sp.get('updated');
  const deleted = sp.get('deleted');
  const hasFlag = created || updated || deleted;

  useEffect(() => {
    if (!hasFlag) return;
    setShow(true);
    const t = setTimeout(() => {
      setShow(false);
      router.replace('/admin/products', { scroll: false });
    }, 3500);
    return () => clearTimeout(t);
  }, [hasFlag, router]);

  if (!hasFlag || !show) return null;

  let label = '';
  let tone = 'ok';
  if (created) label = `Producto #${created} creado. Ya está disponible en la tienda.`;
  else if (updated) label = `Producto #${updated} guardado. Los cambios ya están en la tienda.`;
  else if (deleted) { label = `Producto #${deleted} eliminado.`; tone = 'warn'; }

  return (
    <div className={`up-toast up-toast--${tone}`} role="status" aria-live="polite">
      <span className="up-toast-mark" aria-hidden>{tone === 'ok' ? '✓' : '✕'}</span>
      <span>{label}</span>
      <style jsx>{`
        .up-toast {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 999;
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.85rem 1.25rem;
          color: #fff;
          border-radius: 11px;
          font-size: 0.85rem;
          letter-spacing: 0.02em;
          font-family: var(--font-montserrat), system-ui, sans-serif;
          box-shadow: 0 18px 38px -16px rgba(0, 0, 0, 0.45);
          animation: up-in 0.25s ease-out;
        }
        .up-toast--ok   { background: #1f6b48; color: #f5fbef; }
        .up-toast--warn { background: #8a4a17; color: #fbf3eb; }
        .up-toast-mark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.18);
          font-weight: 700;
        }
        @keyframes up-in {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
