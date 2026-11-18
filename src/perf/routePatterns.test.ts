import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  articleMissingContentVisibilityIssues,
  categoryMissingUseCacheIssues,
  categoryNavMissingPrefetchIssues,
  likeSessionDbWaterfallIssues,
  likeSkeletonBlankIssues,
  paramsChromeBehindSuspenseIssues,
} from "./routePatterns";

const root = process.cwd();

describe("paramsChromeBehindSuspenseIssues", () => {
  it("fails on the past category page pattern (chrome behind params Suspense)", () => {
    const past = `
export default function CategoryPage({ params, searchParams }: PageProps<"/c/[category]">) {
  return (
    <Suspense fallback={<p>불러오는 중…</p>}>
      <CategoryView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
`;
    expect(paramsChromeBehindSuspenseIssues(past)).toEqual([
      expect.stringContaining("Await params outside Suspense"),
    ]);
  });

  it("fails on the older params.then-inside-Suspense pattern", () => {
    const past = `
export default function CategoryPage({ params }: PageProps<"/c/[category]">) {
  return (
    <Suspense>
      {params.then(({ category }) => (
        <CategoryView category={category} />
      ))}
    </Suspense>
  );
}
`;
    expect(paramsChromeBehindSuspenseIssues(past).length).toBeGreaterThan(0);
  });

  it("passes the live category page (params awaited before chrome)", () => {
    const src = fs.readFileSync(path.join(root, "src/app/c/[category]/page.tsx"), "utf8");
    expect(paramsChromeBehindSuspenseIssues(src)).toEqual([]);
  });
});

describe("categoryNavMissingPrefetchIssues", () => {
  it("fails when SiteIndex imports next/link instead of CategoryNavLink", () => {
    const past = `
import Link from "next/link";
export function WithIndex() {
  return <aside aria-label="분류"><Link href={categoryHref(c)}>x</Link></aside>;
}
`;
    expect(categoryNavMissingPrefetchIssues(past)).toEqual([
      expect.stringContaining("CategoryNavLink"),
    ]);
  });

  it("fails when categoryHref Link omits prefetch={true}", () => {
    const past = `
<Link href={categoryHref(c)} className="x">{categoryLabel(c)}</Link>
`;
    expect(categoryNavMissingPrefetchIssues(past)).toEqual([
      expect.stringContaining("CategoryNavLink"),
    ]);
  });

  it("passes SiteIndex (CategoryNavLink owns prefetch)", () => {
    const src = fs.readFileSync(path.join(root, "src/components/SiteIndex.tsx"), "utf8");
    expect(categoryNavMissingPrefetchIssues(src)).toEqual([]);
  });

  it("CategoryNavLink hardcodes prefetch={true}", () => {
    const src = fs.readFileSync(path.join(root, "src/components/CategoryNavLink.tsx"), "utf8");
    expect(src).toMatch(/prefetch=\{true\}/);
  });
});

describe("likeSessionDbWaterfallIssues", () => {
  it("fails on sequential getSession then getDb", () => {
    const past = `
export async function LikeButton({ slug }: { slug: string }) {
  await connection();
  const requestHeaders = await headers();
  session = await getSession(requestHeaders);
  state = await getDb().then((db) => getLikeState(db, slug, session?.user.id));
}
`;
    expect(likeSessionDbWaterfallIssues(past)).toEqual([
      expect.stringContaining("Promise.all"),
    ]);
  });

  it("passes live LikeButton overlap", () => {
    const src = fs.readFileSync(path.join(root, "src/components/likes/LikeButton.tsx"), "utf8");
    expect(likeSessionDbWaterfallIssues(src)).toEqual([]);
  });
});

describe("likeSkeletonBlankIssues", () => {
  it("fails on blank soft-circle skeleton", () => {
    const past = `
export function LikeButtonSkeleton() {
  return <span className="block size-14 rounded-full bg-soft" aria-hidden />;
}
`;
    expect(likeSkeletonBlankIssues(past)).toEqual([
      expect.stringContaining("heart"),
    ]);
  });

  it("passes live LikeButtonSkeleton with heart", () => {
    const src = fs.readFileSync(path.join(root, "src/components/likes/LikeButton.tsx"), "utf8");
    expect(likeSkeletonBlankIssues(src)).toEqual([]);
  });
});

describe("categoryMissingUseCacheIssues", () => {
  it("fails when category page has no use cache", () => {
    const past = `
async function CategoryView({ category }: { category: string }) {
  const articles = listArticles();
  return <WithIndex articles={articles} active={category} />;
}
`;
    expect(categoryMissingUseCacheIssues(past)).toEqual([
      expect.stringContaining("use cache"),
    ]);
  });

  it("passes live category page with use cache", () => {
    const src = fs.readFileSync(path.join(root, "src/app/c/[category]/page.tsx"), "utf8");
    expect(categoryMissingUseCacheIssues(src)).toEqual([]);
  });
});

describe("articleMissingContentVisibilityIssues", () => {
  it("fails when CSS lacks content-visibility", () => {
    expect(articleMissingContentVisibilityIssues(".prose-article { font-size: 1rem; }")).toEqual([
      expect.stringContaining("content-visibility"),
    ]);
  });

  it("passes live globals.css", () => {
    const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");
    expect(articleMissingContentVisibilityIssues(css)).toEqual([]);
  });
});
