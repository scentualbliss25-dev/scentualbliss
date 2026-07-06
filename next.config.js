import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      // Supabase Storage para imágenes de producto subidas desde el admin.
      // El hostname se infiere de NEXT_PUBLIC_SUPABASE_URL; aceptamos
      // cualquier subdomain *.supabase.co/storage/v1/object/public/*.
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  experimental: {
    serverActions: {
      // Permite uploads de hasta 5MB desde Server Actions (default es 1MB).
      // Imágenes de producto suelen pesar 100KB–2MB; dejamos margen.
      bodySizeLimit: '5mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Fuerza HTTPS por 2 años (el sitio ya vive solo en HTTPS vía Vercel)
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          // El browser no debe "adivinar" content-types (bloquea MIME sniffing)
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Nadie puede embeber el sitio en un iframe externo (clickjacking,
          // especialmente relevante para el panel /admin)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // No filtrar la URL completa como referrer a otros sitios
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // APIs del browser que este sitio no usa — negadas explícitamente
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
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
