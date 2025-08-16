
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
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  experimental: {
    // This is to allow the Next.js dev server to accept requests from the Studio editor.
    allowedDevOrigins: [
      '*.cluster-bg6uurscprhn6qxr6xwtrhvkf6.cloudworkstations.dev',
    ],
  },
};

export default nextConfig;
