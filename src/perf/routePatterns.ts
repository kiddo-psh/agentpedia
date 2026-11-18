/**
 * Structural checks for route/perf anti-patterns agents keep reintroducing.
 * Used by tests; error text names the file or pattern to copy instead.
 */

/** Past category/article mistake: default export only returns Suspense that receives `params` for chrome. */
export function paramsChromeBehindSuspenseIssues(source: string): string[] {
  const issues: string[] = [];
  const isSyncDefault =
    /export default function \w+\(\s*\{[^}]*\bparams\b/.test(source) &&
    !/export default async function \w+\(\s*\{[^}]*\bparams\b/.test(source);
  const suspenseGetsParams =
    /return\s*\(\s*<Suspense[\s\S]*?\bparams=\{params\}/.test(source) ||
    /<Suspense[\s\S]*\bparams\.then\s*\(/.test(source);
  if (isSyncDefault && suspenseGetsParams) {
    issues.push(
      "Await params outside Suspense before primary chrome (WithIndex / article body). Copy src/app/a/[slug]/page.tsx; see docs/perf/2026-11-14-first-paint.md.",
    );
  }
  return issues;
}
