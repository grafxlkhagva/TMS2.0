
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
  env: {
    CONTRACTED_TRANSPORT_SHEET_ID: process.env.CONTRACTED_TRANSPORT_SHEET_ID,
    CONTRACTED_TRANSPORT_SHEET_NAME: process.env.CONTRACTED_TRANSPORT_SHEET_NAME,
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
    GOOGLE_SHEET_NAME: process.env.GOOGLE_SHEET_NAME,
  }
};

export default nextConfig;
