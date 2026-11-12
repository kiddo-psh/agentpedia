import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
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
