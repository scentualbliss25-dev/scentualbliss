'use client';
import { useEffect } from 'react';

// Registra el service worker la primera vez que el admin abre la app.
// Necesario para que las push notifications funcionen.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[sw] No se pudo registrar:', err);
    });
  }, []);
  return null;
}
