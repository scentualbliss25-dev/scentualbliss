/** @type {import('next').NextConfig} */
const nextConfig = {
  // Oculta el indicador "N" de Next.js DevTools en desarrollo
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.pravatar.cc' },
    ],
  },
  // Limita workers de build (CloudLinux/Hostinger NPROC limit)
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
