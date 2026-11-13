import { defineConfig } from "drizzle-kit";

// Migrations run DDL in transactions, so they skip Neon's pooler and use the direct URL.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  ...(url ? { dbCredentials: { url } } : {}),
});
