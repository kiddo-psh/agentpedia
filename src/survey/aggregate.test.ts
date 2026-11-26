import { describe, expect, it } from "vitest";
import { aggregateSurvey, percentOf } from "./aggregate";
import { PUBLISH_AT } from "./limits";
import type { SurveyAnswer } from "./validate";

const catalog = {
  agents: [
    { id: "claude-code", label: "Claude Code" },
    { id: "other", label: "기타" },
  ],
  models: [
    { id: "opus-5-5", label: "Claude Opus 5.5" },
    { id: "other", label: "기타" },
  ],
  uses: [
    { id: "web", label: "웹 프론트" },
    { id: "other", label: "기타" },
  ],
  tenures: [
    { id: "lt-1m", label: "1개월 미만" },
    { id: "6m-plus", label: "6개월+" },
  ],
};

function answer(partial: Partial<SurveyAnswer> = {}): SurveyAnswer {
  return {
    agents: ["claude-code"],
    agentOther: null,
    model: "opus-5-5",
    modelOther: null,
    uses: ["web"],
    useOther: null,
    tenure: "6m-plus",
    ...partial,
  };
}

describe("aggregateSurvey", () => {
  it("counts nothing when there are no rows", () => {
    expect(aggregateSurvey([], catalog)).toEqual({
      n: 0,
      threshold: PUBLISH_AT,
      published: false,
      agents: [],
      models: [],
      uses: [],
      tenures: [],
    });
  });

  it("hides the breakdown until the threshold and still reports n", () => {
    const hidden = aggregateSurvey(Array.from({ length: PUBLISH_AT - 1 }, () => answer()), catalog);
    expect(hidden.n).toBe(PUBLISH_AT - 1);
    expect(hidden.published).toBe(false);
    expect(hidden.agents).toEqual([]);
  });

  it("publishes counts and percents of respondents, once per person", () => {
    const rows = [
      ...Array.from({ length: 20 }, () => answer({ agents: ["claude-code", "claude-code"], uses: ["web", "other"], useOther: "습작" })),
      ...Array.from({ length: 10 }, () =>
        answer({
          agents: ["other"],
          agentOther: "비밀",
          model: "other",
          modelOther: "로컬",
          uses: ["other"],
          useOther: "비밀 용도",
          tenure: "lt-1m",
        }),
      ),
    ];
    const results = aggregateSurvey(rows, catalog);
    expect(results.n).toBe(30);
    expect(results.published).toBe(true);
    expect(results.agents).toEqual([
      { id: "claude-code", label: "Claude Code", count: 20, percent: percentOf(20, 30) },
      { id: "other", label: "기타", count: 10, percent: percentOf(10, 30) },
    ]);
    expect(results.models.find((bucket) => bucket.id === "opus-5-5")).toMatchObject({ count: 20, percent: 67 });
    expect(results.uses.find((bucket) => bucket.id === "web")).toMatchObject({ count: 20 });
    expect(results.uses.find((bucket) => bucket.id === "other")).toMatchObject({ count: 30 });
    expect(results.tenures.map((bucket) => [bucket.id, bucket.count])).toEqual([
      ["lt-1m", 10],
      ["6m-plus", 20],
    ]);
    expect(JSON.stringify(results)).not.toContain("비밀");
    expect(JSON.stringify(results)).not.toContain("로컬");
    expect(JSON.stringify(results)).not.toContain("습작");
  });

  it("keeps a stored id that is no longer in the catalog", () => {
    const rows = Array.from({ length: PUBLISH_AT }, () => answer({ model: "retired-model" }));
    const results = aggregateSurvey(rows, catalog);
    expect(results.models.find((bucket) => bucket.id === "retired-model")).toMatchObject({
      label: "retired-model",
      count: PUBLISH_AT,
      percent: 100,
    });
  });
});
