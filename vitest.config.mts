import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve the "@/*" alias from tsconfig.json, same as Next.js.
  resolve: { tsconfigPaths: true },
  test: {
    // DB tests boot an in-memory PGlite and run migrations; on a busy machine that alone
    // passes the 5s/10s defaults and fails the pre-commit hook.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
