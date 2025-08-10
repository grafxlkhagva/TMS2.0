
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
  // This is to allow the Next.js dev server to accept requests from the Studio editor.
  experimental: {
    //
  },
  allowedDevOrigins: [
    '*.cluster-bg6uurscprhn6qxr6xwtrhvkf6.cloudworkstations.dev',
  ],
};

export default nextConfig;
