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
      {
        // Cloudinary CDN — images/videos uploaded via the Cloudinary path
        // have URLs like https://res.cloudinary.com/<cloud>/image/upload/...
        // which do NOT match /uploads/** so we must allow this host separately.
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
