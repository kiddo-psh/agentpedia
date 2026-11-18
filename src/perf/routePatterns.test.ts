import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { paramsChromeBehindSuspenseIssues } from "./routePatterns";

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
