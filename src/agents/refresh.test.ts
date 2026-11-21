import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import type { FetchFn } from "./collectors/fetch";
import { refreshAgentFacts } from "./refresh";

const tmpDirs: string[] = [];
afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const facts = `
slug: demo
name: Demo
vendor: Demo Co
form: [cli]
npmPackage: "@demo/cli"
repoUrl: https://github.com/demo/cli
benchmarks:
  - bench: Terminal-Bench
    version: "4.1"
    model: M
    agentHarness: Demo
    scoreKind: harness
    score: 1
    unit: "%"
    url: https://www.tbench.ai/leaderboard
    asOf: 2026-11-21
`;

function seed(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agent-refresh-"));
  tmpDirs.push(root);
  const dir = path.join(root, "content", "agents", "demo");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "facts.yaml"), facts);
  return root;
}

const fetchFn: FetchFn = async (url) => {
  if (url.includes("api.npmjs.org")) {
    return Response.json({ downloads: 10, start: "2026-11-13", end: "2026-11-19", package: "@demo/cli" });
  }
  if (url.endsWith("/releases/latest")) {
    return Response.json({
      tag_name: "v9",
      html_url: "https://github.com/demo/cli/releases/tag/v9",
      published_at: "2026-11-20T01:00:00Z",
    });
  }
  if (url.includes("api.github.com/repos/demo/cli")) {
    return Response.json({ stargazers_count: 42 });
  }
  return new Response("missing", { status: 404 });
};

describe("refreshAgentFacts", () => {
  it("writes npm downloads, stars, and the latest tag without touching benchmarks", async () => {
    const root = seed();
    const result = await refreshAgentFacts({
      cwd: root,
      fetchFn,
      now: new Date("2026-11-21T03:00:00Z"),
      token: "test-token",
    });
    expect(result.errors).toEqual([]);
    expect(result.updated).toEqual(["demo"]);

    const saved = parseYaml(fs.readFileSync(path.join(root, "content", "agents", "demo", "facts.yaml"), "utf8"));
    expect(saved.npmWeeklyDownloads).toMatchObject({
      value: 10,
      sourceUrl: "https://api.npmjs.org/downloads/point/2026-11-13:2026-11-19/@demo/cli",
      asOf: "2026-11-19",
    });
    expect(saved.githubStars).toMatchObject({
      value: 42,
      asOf: "2026-11-21",
    });
    expect(saved.latestVersion).toMatchObject({
      value: "v9",
      sourceUrl: "https://github.com/demo/cli/releases/tag/v9",
      asOf: "2026-11-20",
    });
    expect(saved.benchmarks).toHaveLength(1);
    expect(saved.benchmarks[0].score).toBe(1);
    expect(saved.benchmarks[0].scoreKind).toBe("harness");
  });

  it("still saves stars when the latest release is missing", async () => {
    const root = seed();
    const result = await refreshAgentFacts({
      cwd: root,
      now: new Date("2026-11-21T03:00:00Z"),
      fetchFn: async (url) => {
        if (url.endsWith("/releases/latest")) return new Response("no", { status: 404 });
        return fetchFn(url);
      },
    });
    expect(result.errors.join("\n")).toMatch(/release/);
    const saved = parseYaml(fs.readFileSync(path.join(root, "content", "agents", "demo", "facts.yaml"), "utf8"));
    expect(saved.githubStars.value).toBe(42);
    expect(saved.latestVersion).toBeUndefined();
    expect(saved.benchmarks[0].score).toBe(1);
  });
});

describe("collect-ideas agent refresh", () => {
  it("commits written facts before the job fails on collector errors", () => {
    const doc = parseYaml(fs.readFileSync(path.join(process.cwd(), ".github/workflows/collect-ideas.yml"), "utf8")) as {
      jobs: { collect: { steps: Array<Record<string, unknown>> } };
    };
    const steps = doc.jobs.collect.steps;
    const refreshAt = steps.findIndex((step) => step.id === "refresh-agents");
    const commitAt = steps.findIndex((step) => step.name === "Commit agent facts if changed");
    const reportAt = steps.findIndex((step) => step.name === "Report agent refresh failures");

    expect(refreshAt).toBeGreaterThanOrEqual(0);
    expect(steps[refreshAt]?.["continue-on-error"]).toBe(true);
    expect(commitAt).toBeGreaterThan(refreshAt);
    expect(reportAt).toBeGreaterThan(commitAt);
    expect(steps[reportAt]?.if).toBe("steps.refresh-agents.outcome == 'failure'");
  });
});
