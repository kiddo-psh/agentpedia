import { describe, expect, it } from "vitest";
import { listModels, loadTaskTiming } from "@/content/models";
import {
  buildModelsTable,
  buildScatterPoints,
  buildTimingRows,
  competitionRanks,
  compareRows,
  paretoFrontier,
  parseEffort,
  pickWhichModels,
  proportionalBars,
} from "./metrics";

describe("parseEffort", () => {
  it("reads the trailing parenthetical from the facts model label", () => {
    expect(parseEffort("Copilot Fusion (max)")).toBe("max");
    expect(parseEffort("Gemini 4 Neon (xhigh)")).toBe("xhigh");
    expect(parseEffort("plain")).toBeNull();
  });
});

describe("competitionRanks", () => {
  it("shares ranks on ties and skips the next place", () => {
    const ranks = competitionRanks(
      [
        { id: "a", value: 71.2 },
        { id: "b", value: 65.8 },
        { id: "c", value: 65.8 },
        { id: "d", value: 64.5 },
        { id: "e", value: null },
      ],
      true,
    );
    expect(ranks.get("a")).toBe(1);
    expect(ranks.get("b")).toBe(2);
    expect(ranks.get("c")).toBe(2);
    expect(ranks.get("d")).toBe(4);
    expect(ranks.get("e")).toBeNull();
  });
});

describe("proportionalBars", () => {
  it("fills by value/max and never inverts cheaper-or-faster rows", () => {
    const bars = proportionalBars([19.4, 3.3, 1.1, null]);
    expect(bars[0]).toBeCloseTo(1);
    expect(bars[1]!).toBeLessThan(bars[0]!);
    expect(bars[2]!).toBeLessThan(bars[1]!);
    expect(bars[3]).toBeNull();
  });
});

describe("paretoFrontier", () => {
  it("keeps minimize-x maximize-y points in cost order", () => {
    const frontier = paretoFrontier([
      { id: "cheap-low", x: 100, y: 40 },
      { id: "mid", x: 500, y: 60 },
      { id: "dominated", x: 800, y: 55 },
      { id: "best", x: 2000, y: 71 },
    ]);
    expect(frontier.map((p) => p.id)).toEqual(["cheap-low", "mid", "best"]);
  });
});

describe("buildModelsTable", () => {
  it("ranks Terminal-Bench scores with shared ties and cheaper-is-better defaults unused for bars", () => {
    const { rows, terminalBench } = buildModelsTable(listModels());
    expect(rows.length).toBeGreaterThanOrEqual(13);
    expect(rows[0]!.slug).toBe("copilot-fusion");
    expect(rows[0]!.rank).toBe(1);
    expect(rows[0]!.effort).toBe("max");
    expect(rows[0]!.scoreDisplay).toContain("±");

    const tied = rows.filter((r) => r.score === 65.8);
    expect(tied.length).toBeGreaterThanOrEqual(2);
    expect(new Set(tied.map((r) => r.rank))).toEqual(new Set([2]));

    const sonnet = rows.find((r) => r.slug === "sonnet-5-5")!;
    const astra = rows.find((r) => r.slug === "gpt-6-2-astra")!;
    expect(sonnet.tokensBillions!).toBeGreaterThan(astra.tokensBillions!);
    expect(sonnet.tokensBar!).toBeGreaterThan(astra.tokensBar!);

    expect(terminalBench.url).toContain("tbench.ai");
  });

  it("sorts cheaper run costs ascending via compareRows", () => {
    const { rows } = buildModelsTable(listModels());
    const sorted = [...rows].filter((r) => r.runCostUsd !== null).sort((a, b) => compareRows(a, b, "runCost", "asc"));
    expect(sorted[0]!.runCostUsd!).toBeLessThanOrEqual(sorted[1]!.runCostUsd!);
  });
});

describe("scatter and timing", () => {
  it("builds scatter points and which-model picks from sourced rows only", () => {
    const table = buildModelsTable(listModels());
    const points = buildScatterPoints(table.rows);
    expect(points.every((p) => p.x > 0 && p.y > 0)).toBe(true);
    const picks = pickWhichModels(points);
    expect(picks.map((p) => p.kind)).toEqual(["performance", "value", "cheap"]);
    expect(picks[0]!.slug).toBe("copilot-fusion");
  });

  it("links Vals timing rows only on exact model name match", () => {
    const timing = buildTimingRows(listModels(), loadTaskTiming());
    expect(timing.some((row) => row.name === "Claude Opus 5" && row.href === "/models/opus-5")).toBe(true);
    expect(timing.some((row) => row.name === "Grok 4.5" && row.href === null)).toBe(true);
  });
});
