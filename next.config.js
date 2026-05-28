import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.pravatar.cc' },
    ],
  },
};

// Sentry config — envuelve el next.config para que el SDK pueda hacer
// source maps upload (los errores en prod muestran la línea real del
// archivo .jsx en vez del bundle minificado).
export default withSentryConfig(nextConfig, {
  // Organization y project de Sentry (visibles en sentry.io/settings)
  org: 'scentualbliss',
  project: 'javascript-nextjs',

  // No subir source maps al build local; solo en CI (Vercel).
  // En el build local Vercel no tiene SENTRY_AUTH_TOKEN, así que skip silencioso.
  silent: !process.env.CI,

  // Oculta los source maps al cliente — solo Sentry los puede leer.
  // Esto evita que los usuarios vean el código original en DevTools.
  hideSourceMaps: true,

  // Desactiva los logger de Sentry en producción para reducir bundle size.
  disableLogger: true,

  // Tree-shake código de Sentry que no se usa.
  widenClientFileUpload: true,
});
