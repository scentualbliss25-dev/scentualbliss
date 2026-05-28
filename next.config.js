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

// En DEV no envolvemos con Sentry: el plugin de webpack genera vendor
// chunks @sentry que ocasionalmente quedan stale tras hot-reload y rompen
// rutas dinámicas con "Cannot find module './vendor-chunks/@sentry.js'".
// Sentry server además ya está deshabilitado en dev (sentry.server.config.js
// `enabled: NODE_ENV === 'production'`), así que no perdemos nada.
//
// En CI/production sí aplicamos el wrapper para que el upload de source maps
// y la instrumentación funcionen como antes.
const isProdBuild = process.env.NODE_ENV === 'production';

export default isProdBuild
  ? withSentryConfig(nextConfig, {
      org: 'scentualbliss',
      project: 'javascript-nextjs',
      silent: !process.env.CI,
      hideSourceMaps: true,
      disableLogger: true,
      widenClientFileUpload: true,
    })
  : nextConfig;
