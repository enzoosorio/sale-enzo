import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Public R2 media bucket (custom domain or r2.dev), e.g. https://media.saleenzo.com
const r2PublicHost = process.env.R2_PUBLIC_BASE_URL
  ? new URL(process.env.R2_PUBLIC_BASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(r2PublicHost
        ? [{ protocol: 'https' as const, hostname: r2PublicHost, port: '', pathname: '/**' }]
        : []),
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

export default withBundleAnalyzer(nextConfig);
