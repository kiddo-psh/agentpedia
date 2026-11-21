import { TASK_TYPES, type TaskType } from "@/db/schema";
import { MIN_TASK_REVIEWS, TOP_STACKS } from "./limits";

export type ReviewSummaryInput = {
  rating: number;
  taskType: TaskType;
  stack: string[];
  wouldUseAgain: boolean;
};

export type TaskCell = {
  taskType: TaskType;
  count: number;
  averageRating: number | null;
  enough: boolean;
};

export type ReviewSummary = {
  count: number;
  averageRating: number | null;
  /** Share of reviews that would use the agent again, from 0 to 1. */
  wouldUseAgain: number | null;
  tasks: TaskCell[];
  topStacks: { tag: string; count: number }[];
};

function mean(sum: number, count: number): number | null {
  if (count === 0) return null;
  return Math.round((sum / count) * 10) / 10;
}

export function summarizeReviews(rows: ReviewSummaryInput[]): ReviewSummary {
  const count = rows.length;
  const ratingSum = rows.reduce((sum, row) => sum + row.rating, 0);
  const again = rows.filter((row) => row.wouldUseAgain).length;
  const stacks = new Map<string, { tag: string; count: number }>();

  for (const row of rows) {
    const seen = new Set<string>();
    for (const tag of row.stack) {
      const key = tag.toLocaleLowerCase("en");
      if (seen.has(key)) continue;
      seen.add(key);
      const current = stacks.get(key);
      if (current) current.count += 1;
      else stacks.set(key, { tag, count: 1 });
    }
  }

  return {
    count,
    averageRating: mean(ratingSum, count),
    wouldUseAgain: count === 0 ? null : again / count,
    tasks: TASK_TYPES.map((taskType) => {
      const mine = rows.filter((row) => row.taskType === taskType);
      return {
        taskType,
        count: mine.length,
        averageRating: mean(
          mine.reduce((sum, row) => sum + row.rating, 0),
          mine.length,
        ),
        enough: mine.length >= MIN_TASK_REVIEWS,
      };
    }),
    topStacks: [...stacks.values()]
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "ko"))
      .slice(0, TOP_STACKS),
  };
}
