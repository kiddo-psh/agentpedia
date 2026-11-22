import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // Tailwind CSS is small. Inlining it removes the render-blocking stylesheet
    // round trip that Slow 4G adds before the LCP text can paint.
    inlineCss: true,
  },
  // PGlite loads its wasm and data files via `new URL(..., import.meta.url)`. Bundled into the
  // Server Components layer, that URL fails Node's fs type check, so load it with plain require.
  serverExternalPackages: ["@electric-sql/pglite"],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
