import { describe, expect, it } from "vitest";
import { ageDays, parseAgentDir, staleFactIssues } from "./agents";
import type { AgentFacts } from "./schema";

const facts = `
slug: demo
name: Demo
vendor: Demo Co
form: [cli]
npmWeeklyDownloads:
  value: 10
  sourceUrl: https://example.com/npm
  asOf: 2026-11-19
`;

const body = "터미널에서 돌아가는 에이전트입니다.\n";

function baseFacts(over: Partial<AgentFacts> = {}): AgentFacts {
  return {
    slug: "demo",
    name: "Demo",
    vendor: "Demo Co",
    form: ["cli"],
    benchmarks: [],
    relatedArticles: [],
    ...over,
  };
}

describe("parseAgentDir", () => {
  it("accepts sourced numbers and plain markdown", () => {
    const result = parseAgentDir("demo", facts, body);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.agent.npmWeeklyDownloads?.value).toBe(10);
  });

  it("rejects a number that has no source", () => {
    const raw = facts + "githubStars:\n  value: 5\n";
    const result = parseAgentDir("demo", raw, body);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.join("\n")).toMatch(/githubStars/);
  });

  it("rejects a body h1 and a JSX component", () => {
    const result = parseAgentDir("demo", facts, "# 제목\n\n<Callout>x</Callout>\n");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const text = result.issues.join("\n");
      expect(text).toMatch(/body headings start at/);
      expect(text).toMatch(/markdown only/);
    }
  });
});

describe("staleFactIssues", () => {
  const now = new Date("2026-11-21T12:00:00Z");

  it("warns only after 90 days", () => {
    expect(ageDays(new Date("2026-08-22T00:00:00Z"), now)).toBe(91);
    const fresh = baseFacts({
      npmWeeklyDownloads: { value: 1, sourceUrl: "https://example.com/a", asOf: new Date("2026-11-01T00:00:00Z") },
    });
    expect(staleFactIssues(fresh, now)).toEqual([]);

    const old = baseFacts({
      githubStars: { value: 1, sourceUrl: "https://example.com/b", asOf: new Date("2026-08-01T00:00:00Z") },
    });
    expect(staleFactIssues(old, now).join("\n")).toMatch(/githubStars: asOf is/);
  });
});
