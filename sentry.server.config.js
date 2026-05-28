// Configuración de Sentry para el servidor (Server Components, API routes,
// Server Actions, middleware en Node.js runtime).
// Captura errores que ocurren mientras Vercel renderiza páginas o procesa
// requests del lado del servidor.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: 0.1,

  enabled: process.env.NODE_ENV === 'production',

  // Si el webhook de Wompi tira un error, queremos saberlo de inmediato.
  // Por eso forzamos sample rate del 100% para esos endpoints.
  // (Si el volumen crece mucho, bajar este valor.)
});
