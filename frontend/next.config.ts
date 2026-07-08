import type { NextConfig } from "next";
import path from "path";

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3001';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
