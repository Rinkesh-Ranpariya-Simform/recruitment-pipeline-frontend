import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Produce a self-contained build under .next/standalone for Docker deployment.
  output: 'standalone',

  // Expose server-side env vars to the client bundle.
  env: {
    API_URL: process.env.API_URL,
  },
};

export default nextConfig;
