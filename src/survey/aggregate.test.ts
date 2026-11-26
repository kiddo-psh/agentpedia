import { describe, expect, it } from "vitest";
import { aggregateSurvey, leadingBucket, percentOf, sortedByCount } from "./aggregate";
import { AGENT_GROUPS } from "./choices";
import type { SurveyAnswer } from "./validate";
import { surveyCatalog } from "./options";

const catalog = surveyCatalog([
  { id: "opus-5-5", label: "Claude Opus 5.5" },
  { id: "grok-4-7", label: "Grok 4.7" },
]);

function answer(partial: Partial<SurveyAnswer> = {}): SurveyAnswer {
  return {
    agents: ["claude-code-cli"],
    agentOther: null,
    models: ["opus-5-5"],
    modelOther: null,
    uses: ["web"],
    useOther: null,
    tenure: "6m-plus",
    ...partial,
  };
}

describe("sortedByCount", () => {
  it("orders by count and keeps a stable label order on ties", () => {
    const ranked = sortedByCount([
      { count: 1, label: "나" },
      { count: 3, label: "가" },
      { count: 1, label: "다" },
    ]);
    expect(ranked.map((item) => item.label)).toEqual(["가", "나", "다"]);
    expect(leadingBucket(ranked)?.label).toBe("가");
    expect(leadingBucket([{ count: 0, label: "가" }])).toBeNull();
  });
});

describe("aggregateSurvey", () => {
  it("draws every bucket at zero when nobody has answered", () => {
    const results = aggregateSurvey([], catalog);
    expect(results.n).toBe(0);
    expect(results.agentGroups.map((group) => group.id)).toEqual(AGENT_GROUPS.map((group) => group.id));
    expect(results.agentGroups.every((group) => group.count === 0 && group.percent === 0)).toBe(true);
    expect(results.models.every((bucket) => bucket.count === 0)).toBe(true);
    expect(JSON.stringify(results)).not.toContain("30명");
  });

  it("rolls a person into a form factor once, and counts each app", () => {
    const rows = [
      answer({ agents: ["claude-code-cli", "cursor"], models: ["opus-5-5", "grok-4-7"] }),
      answer({ agents: ["codex-cli"], models: ["opus-5-5"] }),
    ];
    const results = aggregateSurvey(rows, catalog);
    const cli = results.agentGroups.find((group) => group.id === "cli");
    const ide = results.agentGroups.find((group) => group.id === "ide");
    expect(cli).toMatchObject({ count: 2, percent: 100 });
    expect(cli?.options.find((option) => option.id === "claude-code-cli")).toMatchObject({ count: 1, percent: 50 });
    expect(cli?.options.find((option) => option.id === "codex-cli")).toMatchObject({ count: 1, percent: 50 });
    expect(ide).toMatchObject({ count: 1, percent: 50 });
    expect(results.models.find((bucket) => bucket.id === "opus-5-5")).toMatchObject({
      count: 2,
      percent: percentOf(2, 2),
    });
    expect(results.models.find((bucket) => bucket.id === "grok-4-7")).toMatchObject({ count: 1, percent: 50 });
  });

  it("keeps a stored id that is no longer in the catalog", () => {
    const results = aggregateSurvey([answer({ agents: ["retired-app"], models: ["retired-model"] })], catalog);
    expect(results.agentGroups.find((group) => group.id === "unknown")?.options).toEqual([
      { id: "retired-app", label: "retired-app", count: 1, percent: 100 },
    ]);
    expect(results.models.find((bucket) => bucket.id === "retired-model")).toMatchObject({ count: 1, percent: 100 });
  });
});
