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
