<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Product

Agentpedia is a sourced reference for coding agents and models, plus articles. Read `docs/architecture.md` before treating the repo as an article-and-kit site. Numeric facts on agent and model pages need `value`, `sourceUrl`, and `asOf` (`SourcedValue` in `src/content/schema.ts`). Do not invent numbers. Article rules stay in `docs/writing-guide.md`. The primary rule is story-first prose (section 3): open on the concrete situation, let each section answer the question the previous one raised, keep real transitions, vary sentence length, put descriptive `##` headings on story beats (`###` for sub-examples), and end on the takeaway. The Lauren Tan article is the reference. Anti-translationese rules and fact rules stay binding: no invented numbers, sources for every fact, and a fact diff (number tokens, URLs, `<Term id>`, `<Quote>` text) when rewriting. Section 11's mechanical sentence rules, including the 60-character limit, are guidance and yield to readability. `npm run validate:content` prints warnings for the grep-able rules and does not fail the build on them.

# Commits

- **Atomic commits**: one logical change per commit. If a change needs its own sentence to explain, it gets its own commit.
  Split dependency bumps, refactors, features, and content into separate commits.
- Every commit must pass `npm run lint` and `npm test`. The `pre-commit` hook enforces this.
- Messages follow Conventional Commits; the `commit-msg` hook enforces it.
  Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`, `ci`, `perf`, `style`, `revert`, and `content` for articles, kits, agent facts, and model facts under `content/`.
- Use `git add -p` to stage only the hunks that belong to the current commit.
- When master gains a new file under `drizzle/`, run `npm run db:migrate` from the main checkout before `git push`.
  The command reads the production URL from `.env.migrate`, which exists only in the main checkout, not in worktrees.
  Ask the user first, because it changes the production database. Check the host it prints before you push.

Example split:

```
chore: bump @types/node to 24 for vitest compatibility
feat(content): add article schema and validator with quote checks
content: add karpathy software 3.0 draft article
```

# Agent rules (Correct)

Each rule pairs with what fails when an agent breaks it. Prefer architecture/types/tests over prose; drop a row once the mistake cannot happen.

| Rule | Enforced by |
|---|---|
| Await `params` outside Suspense before primary chrome (WithIndex / article body); only searchParams/request-time holes belong behind the boundary | `paramsChromeBehindSuspenseIssues` in `src/perf/routePatterns.ts` (vitest); copy `src/app/a/[slug]/page.tsx` / `src/app/c/[category]/page.tsx` |
| Article MDX/prose streams behind Suspense (cached above-fold shell only); do not inline `ArticleBody` in the `"use cache"` shell | `articleBodyBeforeSuspenseIssues` on `src/app/a/[slug]/page.tsx` |
| Category/index nav Links must full-prefetch under `partialPrefetching` | `CategoryNavLink` (`prefetch={true}`); `categoryNavMissingPrefetchIssues` fails if `SiteIndex` imports `next/link` or omits prefetch on category hrefs |
| Home/category article Links must full-prefetch under `partialPrefetching` | `ArticleNavLink` (`prefetch={true}`); `articleNavMissingPrefetchIssues` on `ArticleList` / home Featured |
| Request-time likes: overlap `getSession` with `getDb` via `Promise.all`; Suspense fallback shows heart + count placeholder, not a blank circle | `likeSessionDbWaterfallIssues` / `likeSkeletonBlankIssues`; copy `Comments.tsx` + `LikeButton.tsx` |
| Public like count paints with the article shell (`LikesSlot` + cached count); session/mine stays behind Suspense | `LikeButton.tsx` (`LikesSlot` / `getPublicLikeCount`) |
| Prerenderable category shell/list uses `"use cache"` like `ArticleView` | `categoryMissingUseCacheIssues` on `src/app/c/[category]/page.tsx` |
| Below-fold article sections use `content-visibility: auto` (with intrinsic size for anchors) | `articleMissingContentVisibilityIssues` on `src/app/globals.css` |
| Conventional Commits + lint/test green per commit | `commit-msg` / `pre-commit` hooks |
| Kit prompts match article claims and safety gates | `checkKitFidelity` via content load / `src/content/kitFidelity.test.ts` |
