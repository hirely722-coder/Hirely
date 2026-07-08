import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://hirely-backend.hirly-app.workers.dev';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  bundlePagesRouterDependencies: true,
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
