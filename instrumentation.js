// Instrumentation hook de Next.js — punto de entrada para herramientas
// de observabilidad. Se ejecuta una sola vez al arrancar el server.
// Detecta el runtime (nodejs / edge) y carga la config correspondiente.
// Sin esto, Sentry no captura errores server-side.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Captura errores de React Server Components automáticamente.
export { captureRequestError as onRequestError } from '@sentry/nextjs';
