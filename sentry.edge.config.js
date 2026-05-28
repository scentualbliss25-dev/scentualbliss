// Configuración de Sentry para el Edge runtime (middleware.js si corre
// en edge, y algunas rutas que se ejecutan en el edge).
// Captura errores que ocurren en este runtime aislado.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: 0.1,

  enabled: process.env.NODE_ENV === 'production',
});
