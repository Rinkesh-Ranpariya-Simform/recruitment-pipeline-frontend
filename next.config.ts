import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Produce a self-contained build under .next/standalone for Docker deployment.
  output: 'standalone',

  /**
   * The browser only ever talks to this origin; `/api/*` is proxied to the
   * backend server-side. This keeps the refresh cookie first-party: the
   * frontend and backend live on different sites in production (vercel.app vs
   * onrender.com), and a `SameSite=Lax` cookie is never sent on a cross-site
   * fetch — which made every page reload fail its bootstrap refresh with 401.
   *
   * `API_URL` is read at build time and must be reachable from the Next server
   * (in Docker that is the `backend` service, not localhost).
   */
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${process.env.API_URL}/api/:path*` }];
  },
};

export default nextConfig;
