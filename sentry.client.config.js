// Configuración de Sentry para el navegador (client-side).
// Captura errores JavaScript de cualquier componente client.
// Se inicializa automáticamente al cargar cualquier página.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Sample rate: 1.0 = 100% de los errores se reportan.
  // Para ahorrar cuota a futuro se puede bajar (ej. 0.5 = 50%).
  tracesSampleRate: 0.1,

  // Solo activamos en producción para no reportar errores de desarrollo
  // que típicamente son ruido (HMR, dev warnings, etc.).
  enabled: process.env.NODE_ENV === 'production',

  // Filtra errores que no son accionables.
  ignoreErrors: [
    // Errores de extensiones del navegador (no son nuestros)
    'top.GLOBALS',
    'Non-Error promise rejection captured',
    // Errores de ResizeObserver (warning benigno, lo loggea Chrome)
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Errores típicos de scripts de tracking de terceros
    /^Script error\.?$/,
    /^Javascript error: Script error\.? on line 0$/,
    // Errores de red transitorios
    'Network request failed',
    'NetworkError',
    'Failed to fetch',
  ],

  // No reportar errores que vienen de scripts de terceros (analytics, ads, etc.)
  denyUrls: [
    /googletagmanager\.com/i,
    /google-analytics\.com/i,
    /facebook\.net/i,
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
  ],

  // Adjunta breadcrumbs (historia de acciones del usuario antes del error)
  // para tener más contexto al debugear.
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Session Replay: graba 0% de sesiones normales y 100% de las que tienen error.
  // Plan free de Sentry incluye replays limitados; ajustar si se acerca al límite.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
});
