/** @type {import('next').NextConfig} */
const nextConfig = {
  // Oculta el indicador "N" de Next.js DevTools en desarrollo
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.pravatar.cc' },
    ],
  },
  // Build standalone — autocontenido, mínimas dependencias en producción
  output: 'standalone',
};

export default nextConfig;
