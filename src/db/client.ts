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
  const db = drizzle(new PGlite(path.join(process.cwd(), ".data", "pglite")), { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as Db;
}

// Survive dev hot reloads: one connection (and one PGlite instance) per process.
const g = globalThis as unknown as { __db?: Promise<Db> };
export const getDb = (): Promise<Db> => (g.__db ??= connect());
