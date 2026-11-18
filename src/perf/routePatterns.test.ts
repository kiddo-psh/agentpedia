import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  categoryNavMissingPrefetchIssues,
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
