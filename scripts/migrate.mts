// Applies drizzle/ migrations to a Postgres database and fails loudly.
// `drizzle-kit migrate` exits 0 even when it never connects, which once made a missing URL look like success.
import fs from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// The production URL lives in .env.migrate, a file Next.js never loads, so `next dev` keeps using PGlite.
// A variable set on the command line still wins over the file.
const ENV_FILE = ".env.migrate";
if (fs.existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

// Migrations run DDL in transactions, so they skip Neon's pooler and use the direct URL.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error(
    [
      `No database URL. Put DATABASE_URL_UNPOOLED=<url> in ${ENV_FILE}, or set it for this command:`,
      '  Git Bash:   DATABASE_URL_UNPOOLED="<url>" npm run db:migrate   (no ";" between them)',
      '  PowerShell: $env:DATABASE_URL_UNPOOLED="<url>"; npm run db:migrate',
    ].join("\n"),
  );
  process.exit(1);
}

// Name the target without its password, so a wrong URL is visible before anything changes.
const { hostname, pathname } = new URL(url);
console.log(`Migrating ${hostname}${pathname}`);

const client = postgres(url, { max: 1, onnotice: () => {} });
try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exitCode = 1;
} finally {
  await client.end();
}
