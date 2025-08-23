
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // This is needed to allow the Next.js dev server to accept requests from the Firebase Studio IDE.
  allowedDevOrigins: ["*.cloudworkstations.dev"],
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
};

export default nextConfig;
