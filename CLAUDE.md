@AGENTS.md

# Commits

- Commit directly to `master`. No PRs for now.
- **Atomic commits**: one logical change per commit. If a change needs its own sentence to explain, it gets its own commit.
  Split dependency bumps, refactors, features, and content into separate commits.
- Every commit must pass `npm run lint` and `npm test`. The `pre-commit` hook enforces this.
- Messages follow Conventional Commits; the `commit-msg` hook enforces it.
  Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`, `ci`, `perf`, `style`, `revert`, and `content` for articles and kits under `content/`.
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
