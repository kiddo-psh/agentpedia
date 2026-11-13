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

5. Apply the migrations to the production database:

   ```bash
   DATABASE_URL_UNPOOLED="<direct Neon URL>" npm run db:migrate
   ```

Run step 5 again whenever `drizzle/` gets a new migration, before you push the code that needs it.

GitHub login works only on the production domain, because the OAuth app has one callback URL. Preview deploys can show comments but cannot sign in.

### Check a deploy

```bash
npm run mcp:smoke -- https://<domain>/mcp
```

```bash
curl -H "Authorization: Bearer $METRICS_TOKEN" https://<domain>/api/metrics
```
