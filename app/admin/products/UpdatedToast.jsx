'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Toast efímero que aparece cuando el listado se carga con ?updated=<id>.
 * Tras 3.5s se auto-cierra y limpia el query param de la URL para que
 * no reaparezca si el usuario refresca.
 */
export default function UpdatedToast() {
  const sp = useSearchParams();
  const router = useRouter();
  const updated = sp.get('updated');
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!updated) return;
    setShow(true);
    const t = setTimeout(() => {
      setShow(false);
      // Limpia el query param sin recarga.
      router.replace('/admin/products', { scroll: false });
    }, 3500);
    return () => clearTimeout(t);
  }, [updated, router]);

  if (!updated || !show) return null;

  return (
    <div className="up-toast" role="status" aria-live="polite">
      <span className="up-toast-mark" aria-hidden>✓</span>
      <span>Producto #{updated} guardado. Los cambios ya están en la tienda.</span>
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
          background: #1f6b48;
          color: #f5fbef;
          border-radius: 11px;
          font-size: 0.85rem;
          letter-spacing: 0.02em;
          font-family: var(--font-montserrat), system-ui, sans-serif;
          box-shadow: 0 18px 38px -16px rgba(0, 0, 0, 0.45);
          animation: up-in 0.25s ease-out;
        }
        .up-toast-mark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(245, 251, 239, 0.18);
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
