import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Servidor Node autónomo para correr en Docker (sin Vercel).
  output: 'standalone',
  // Fijar la raíz del monorepo para que el árbol de `standalone` sea determinista.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // Habilitar React strict mode
  reactStrictMode: true,
};

export default nextConfig;
