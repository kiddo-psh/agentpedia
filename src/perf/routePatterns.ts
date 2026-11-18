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

/** LikeButton used to await getSession then getDb; Comments already overlaps them. */
export function likeSessionDbWaterfallIssues(source: string): string[] {
  if (!/\bgetSession\b/.test(source) || !/\bgetDb\b/.test(source)) return [];
  const parallel =
    /Promise\.all\(\s*\[[\s\S]*?\bgetSession\b[\s\S]*?\bgetDb\b[\s\S]*?\]\s*\)/.test(source) ||
    /Promise\.all\(\s*\[[\s\S]*?\bgetDb\b[\s\S]*?\bgetSession\b[\s\S]*?\]\s*\)/.test(source);
  if (parallel) return [];
  if (/await getSession\b[\s\S]*?getDb\(/.test(source)) {
    return [
      "Overlap getSession with getDb via Promise.all in LikeButton (same pattern as Comments.tsx).",
    ];
  }
  return [];
}

/** Blank soft circle with no heart/count reads as missing, not loading. */
export function likeSkeletonBlankIssues(source: string): string[] {
  const skeleton = source.match(
    /export function LikeButtonSkeleton\(\)[\s\S]*?(?=export |$)/,
  )?.[0];
  if (!skeleton) return [];
  const blankOnly =
    /rounded-full bg-soft/.test(skeleton) &&
    !/Heart|heart|aria-label|좋아요/.test(skeleton);
  if (blankOnly) {
    return [
      "LikeButtonSkeleton must show a heart (and count placeholder), not a blank circle. See docs/article-load-like-perf.md.",
    ];
  }
  return [];
}

/** Category list/shell must use Cache Components like ArticleView. */
export function categoryMissingUseCacheIssues(source: string): string[] {
  if (!/CategoryShell|CategoryList|CategoryView|CategoryPage/.test(source)) return [];
  if (!/"use cache"/.test(source)) {
    return [
      'Add "use cache" on the category shell/list (same as ArticleView in src/app/a/[slug]/page.tsx).',
    ];
  }
  return [];
}
