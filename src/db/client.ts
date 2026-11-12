import fs from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * DATABASE_URL set -> Postgres (production, Supabase/Neon).
 * Unset -> embedded PGlite under .data/ so local dev needs no database server.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    return drizzle(postgres(url, { prepare: false }), { schema }) as unknown as Db;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  // PGlite creates its own folder but not missing parents.
  fs.mkdirSync(path.join(process.cwd(), ".data"), { recursive: true });
  // PGlite is single-process. `next dev` and a local `next start` running side by side must not
  // share one data folder, or the files corrupt; give each its own.
  const dir =
    process.env.NODE_ENV === "production"
      ? path.join(process.cwd(), ".data", "pglite-prod")
      : path.join(process.cwd(), ".data", "pglite");
  const db = drizzle(new PGlite(dir), { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as Db;
}

// Survive dev hot reloads: one connection (and one PGlite instance) per process.
const g = globalThis as unknown as { __db?: Promise<Db> };
export function getDb(): Promise<Db> {
  // A failed connect is not cached, so the next request retries.
  g.__db ??= connect().catch((err) => {
    g.__db = undefined;
    throw err;
  });
  return g.__db;
}
