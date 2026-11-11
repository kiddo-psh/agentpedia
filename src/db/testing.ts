import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Db } from "./client";
import * as schema from "./schema";

/** A fresh in-memory database with all migrations applied. For tests only. */
export async function createTestDb(): Promise<Db> {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as Db;
}

export async function insertUser(db: Db, id = "u1", name = "테스터") {
  const [u] = await db
    .insert(schema.user)
    .values({ id, name, email: `${id}@example.test`, updatedAt: new Date() })
    .returning();
  return u;
}
