import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve the "@/*" alias from tsconfig.json, same as Next.js.
  resolve: { tsconfigPaths: true },
});
