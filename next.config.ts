import type { NextConfig } from "next";

/**
 * Two build modes:
 *  - `next dev` / `next build` → normal server build. A dev-only route handler
 *    at app/api/rpc2/route.ts proxies RPC calls to the live Komari instance and
 *    rewrites the Origin header (the live server enforces an origin allowlist).
 *  - `BUILD_EXPORT=true next build` → static SPA export into `out/`. The packaging
 *    script removes app/api first (route handlers can't be statically exported);
 *    in production the theme is served by Komari, so `/api/rpc2` is same-origin.
 */
const isExport = process.env.BUILD_EXPORT === "true";

const nextConfig: NextConfig = {
  output: isExport ? "export" : undefined,
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
