/**
 * Build and serve the site without the dev server, drafts included.
 * Article pages are prerendered at build time; `next start` serves them as static HTML.
 *
 *   npm run preview            # http://localhost:3100
 *   npm run preview -- 4000    # another port
 *
 * Cross-platform replacement for `SHOW_DRAFTS=1 next build && next start`.
 * Comments use their own database (.data/pglite-prod), so this can run beside `npm run dev`.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const port = process.argv[2] ?? "3100";

// Better Auth refuses its default secret in production. Keep one local secret so preview
// sessions survive restarts; a real deployment sets BETTER_AUTH_SECRET itself.
function localSecret(): string {
  const file = path.join(process.cwd(), ".data", "preview-secret");
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, randomBytes(32).toString("base64"));
  }
  return fs.readFileSync(file, "utf8").trim();
}

const env = {
  ...process.env,
  SHOW_DRAFTS: "1",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? localSecret(),
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? `http://localhost:${port}`,
};

function run(args: string[]) {
  const r = spawnSync("npm", args, { stdio: "inherit", env, shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run(["run", "build"]);
run(["run", "start", "--", "-p", port]);
