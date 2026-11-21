import { describe, expect, it } from "vitest";
import { loadAllModels, loadTaskTiming, parseModelDir, staleModelFactIssues } from "./models";
import { ModelFacts } from "./schema";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const facts = `
slug: demo-model
name: Demo Model
vendor: Demo
inputUsdPerMTok:
  value: 1
  sourceUrl: https://example.com/price
  asOf: 2026-11-21
benchmarks:
  - bench: Terminal-Bench
    version: "4.1"
    model: Demo
    agentHarness: Demo Agent
    scoreKind: harness
    score: 10
    unit: "%"
    costUsd: 100
    tokensBillions: 1.5
    url: https://www.tbench.ai/leaderboard
    asOf: 2026-11-21
`;

describe("models content", () => {
  it("loads the seeded frontier models", () => {
    const bySlug = new Map(loadAllModels().map((model) => [model.slug, model]));
    expect(bySlug.size).toBeGreaterThanOrEqual(13);
    expect(bySlug.get("copilot-fusion")?.benchmarks[0]).toMatchObject({
      score: 71.2,
      margin: 2.9,
      agentHarness: "GitHub Copilot",
      costUsd: 2000,
      tokensBillions: 3.3,
    });
    expect(bySlug.get("copilot-fusion")?.inputUsdPerMTok).toBeUndefined();
    expect(bySlug.get("opus-5-5")?.outputUsdPerMTok?.value).toBe(20);
    expect(bySlug.get("fable-5-2")?.benchmarks[0]?.score).toBe(65.8);
    expect(bySlug.get("sonnet-5-5")?.inputUsdPerMTok?.value).toBe(2);
    expect(bySlug.get("gemini-4-neon")?.benchmarks[0]?.costUsd).toBe(1900);
    expect(bySlug.get("grok-4-6")?.benchmarks[0]?.score).toBe(19.7);
    expect(bySlug.get("gpt-6-2-sol")?.outputUsdPerMTok?.value).toBe(10);
  });

  it("loads the Vals timing rows for the duration chart", () => {
    const rows = loadTaskTiming();
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows[0]).toMatchObject({ model: "Claude Opus 5", durationSec: 577 });
  });

  it("ranks models by Terminal-Bench score", async () => {
    const { rankModelsByTerminalBench } = await import("./models");
    const ranked = rankModelsByTerminalBench();
    expect(ranked[0]?.slug).toBe("copilot-fusion");
    expect(ranked.at(-1)?.slug).toMatch(/grok-4-6/);
  });

  it("rejects unsourced token prices", () => {
    expect(ModelFacts.safeParse({ slug: "x", name: "X", vendor: "V", inputUsdPerMTok: { value: 1 } }).success).toBe(
      false,
    );
  });

  it("parses a model directory and warns on stale prices", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "model-"));
    const dir = path.join(root, "demo-model");
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, "facts.yaml"), facts);
    fs.writeFileSync(path.join(dir, "index.mdx"), "본문입니다.\n");
    const parsed = parseModelDir(dir, "demo-model");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const old = {
      ...parsed.model,
      inputUsdPerMTok: {
        value: 1,
        sourceUrl: "https://example.com/price",
        asOf: new Date("2026-01-01T00:00:00Z"),
      },
    };
    expect(staleModelFactIssues(old, new Date("2026-11-21T00:00:00Z")).join("\n")).toMatch(/inputUsdPerMTok/);
  });
});
