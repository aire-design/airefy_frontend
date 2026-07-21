import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Local development: http://localhost:8000/uploads/...
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/uploads/**',
      },
      {
        // Any http backend (e.g. non-SSL production / staging servers)
        protocol: 'http',
        hostname: '**',
        pathname: '/uploads/**',
      },
      {
        // Any https backend (SSL production servers)
        protocol: 'https',
        hostname: '**',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;
