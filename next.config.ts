import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Public R2 media bucket (custom domain or r2.dev), e.g. https://media.saleenzo.com
const r2PublicHost = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL
  ? new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL).hostname
  : null;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;
const localSupabase = supabaseUrl?.hostname === '127.0.0.1' || supabaseUrl?.hostname === 'localhost';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: {
    dangerouslyAllowLocalIP: localSupabase,
    remotePatterns: [
      ...(r2PublicHost
        ? [{ protocol: 'https' as const, hostname: r2PublicHost, port: '', pathname: '/**' }]
        : []),
      ...(supabaseUrl ? [{
        protocol: supabaseUrl.protocol.slice(0, -1) as 'http' | 'https',
        hostname: supabaseUrl.hostname,
        port: supabaseUrl.port,
        pathname: '/storage/v1/object/public/**',
      }] : []),
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
