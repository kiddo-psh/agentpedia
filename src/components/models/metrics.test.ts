import { describe, expect, it } from "vitest";
import { listModels, loadTaskTiming } from "@/content/models";
import { buildLeaderboard } from "./metrics";

describe("buildLeaderboard", () => {
  it("ranks Terminal-Bench score high-to-low and links model rows", () => {
    const { boards } = buildLeaderboard(listModels(), loadTaskTiming());
    const scored = boards.score.rows.filter((row) => row.value !== null);
    expect(scored.length).toBeGreaterThanOrEqual(12);
    expect(scored[0]!.rank).toBe(1);
    expect(scored[0]!.value!).toBeGreaterThanOrEqual(scored[1]!.value!);
    expect(scored[0]!.href).toMatch(/^\/models\//);
    expect(boards.score.sourceUrl).toContain("tbench.ai");
  });

  it("ranks task time low-to-high from Vals rows", () => {
    const { boards } = buildLeaderboard(listModels(), loadTaskTiming());
    const timed = boards.taskTime.rows.filter((row) => row.value !== null);
    expect(timed[0]!.value!).toBeLessThanOrEqual(timed[1]!.value!);
    expect(timed.some((row) => row.name === "Claude Opus 5" && row.href === "/models/opus-5")).toBe(true);
  });
});
