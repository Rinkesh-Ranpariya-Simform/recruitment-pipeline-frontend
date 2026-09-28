import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Produce a self-contained build under .next/standalone for Docker deployment.
  output: 'standalone',
};

export default nextConfig;
