import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Optimizar fuentes de Google automáticamente
  optimizeFonts: true,
  // Imágenes: dominio de R2 para optimización
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.aihub.example.com',
        pathname: '/**',
      },
    ],
  },
  // Habilitar React strict mode
  reactStrictMode: true,
};

export default nextConfig;
