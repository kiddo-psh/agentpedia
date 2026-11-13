This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## View articles without the dev server

```bash
npm run preview
```

This builds the site with drafts included and serves it at [http://localhost:3100](http://localhost:3100).
Article pages are prerendered at build time, so they are served as static HTML.
Pass another port with `npm run preview -- 4000`.

Rebuild after you edit content: run `npm run preview` again.
The preview keeps its comments in `.data/pglite-prod`, separate from the dev server's `.data/pglite`, so both can run at the same time.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Deploy

Production runs on Vercel with Neon Postgres. Pushes to `master` deploy to production; other branches get preview deploys.

### One-time setup

1. Import `kiddo-psh/agentpedia` in Vercel. Set the Production Branch to `master`.
2. Add the Neon integration from the Vercel Marketplace. It sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct).
3. Create a GitHub OAuth app. Set its callback URL to `https://<domain>/api/auth/callback/github`.
4. Set these environment variables in Vercel:

   | Variable | Environment | Value |
   | --- | --- | --- |
   | `BETTER_AUTH_SECRET` | Production | `openssl rand -base64 32` |
   | `BETTER_AUTH_URL` | Production | `https://<domain>` |
   | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Production | From the OAuth app |
   | `EVENT_SALT` | Production | A long random string |
   | `METRICS_TOKEN` | Production | A long random string |
   | `SHOW_DRAFTS` | Preview | `1` |

5. Add Upstash for Redis from the Vercel Marketplace and connect it to the project. It sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`, which turn on the rate limit of 60 requests per minute per IP on `/mcp` and `/api/events`. A database created on upstash.com works too: set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` instead. Without either pair, nothing is rate limited.
6. Save the production database URL in `.env.migrate` at the repo root. Copy `DATABASE_URL_UNPOOLED` from Vercel → Storage → `agentpedia-db`:

   ```
   DATABASE_URL_UNPOOLED=<direct Neon URL>
   ```

   Git ignores the file, and Next.js never loads it, so `npm run dev` keeps using the local PGlite database. Do not put this URL in `.env.local`: `next dev` reads that file and would write to production.
7. Apply the migrations to the production database:

   ```bash
   npm run db:migrate
   ```

   The command prints the host and database it migrates, without the password. It exits with an error when no URL is set or a migration fails. Running it again is safe: it skips migrations that are already applied.

   Without `.env.migrate`, pass the URL for one run. In Git Bash, put no `;` between the variable and the command, or the variable never reaches `npm`:

   ```bash
   DATABASE_URL_UNPOOLED="<direct Neon URL>" npm run db:migrate
   ```

   In PowerShell:

   ```powershell
   $env:DATABASE_URL_UNPOOLED="<direct Neon URL>"; npm run db:migrate
   ```

Run step 7 again whenever `drizzle/` gets a new migration, before you push the code that needs it.

GitHub login works only on the production domain, because the OAuth app has one callback URL. Preview deploys can show comments but cannot sign in.

### Check a deploy

```bash
npm run mcp:smoke -- https://<domain>/mcp
```

```bash
curl -H "Authorization: Bearer $METRICS_TOKEN" https://<domain>/api/metrics
```
