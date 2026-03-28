import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hdbhvgxogazmawphpcnj.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
        
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
      },
    ],
  },
};

export default nextConfig;
