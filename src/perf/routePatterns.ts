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

/** Under partialPrefetching, category Links need prefetch={true} or params content waits until click. */
export function categoryNavMissingPrefetchIssues(source: string): string[] {
  const issues: string[] = [];
  // SiteIndex must not import next/link directly — CategoryNavLink owns prefetch={true}.
  if (/from\s+["']next\/link["']/.test(source) && /categoryHref|aria-label="분류"/.test(source)) {
    issues.push(
      "Use CategoryNavLink (prefetch={true}) for category/index Links. Default Link prefetch is shell-only when partialPrefetching is on.",
    );
    return issues;
  }
  const linkTag =
    /<Link\b([^>]*?)\bhref=\{(?:categoryHref\([^)]*\)|`\/c\/\$\{[^}]+\}`)\}([^>]*)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = linkTag.exec(source))) {
    const attrs = `${m[1]} ${m[2]}`;
    if (!/\bprefetch=\{true\}/.test(attrs)) {
      issues.push(
        "Use CategoryNavLink (prefetch={true}) for category/index Links. Default Link prefetch is shell-only when partialPrefetching is on.",
      );
      break;
    }
  }
  const stringHref = /<Link\b([^>]*?)\bhref="\/c\/[^"]+"([^>]*)\/?>/g;
  while ((m = stringHref.exec(source))) {
    const attrs = `${m[1]} ${m[2]}`;
    if (!/\bprefetch=\{true\}/.test(attrs)) {
      issues.push(
        "Use CategoryNavLink (prefetch={true}) for category/index Links. Default Link prefetch is shell-only when partialPrefetching is on.",
      );
      break;
    }
  }
  return issues;
}
