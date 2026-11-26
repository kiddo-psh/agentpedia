import { PUBLISH_AT } from "./limits";
import type { SurveyOption } from "./options";
import type { SurveyAnswer } from "./validate";

export type Bucket = { id: string; label: string; count: number; percent: number };

export type SurveyResults = {
  n: number;
  threshold: number;
  published: boolean;
  agents: Bucket[];
  models: Bucket[];
  uses: Bucket[];
  tenures: Bucket[];
};

export type SurveyCatalog = {
  agents: readonly SurveyOption[];
  models: readonly SurveyOption[];
  uses: readonly SurveyOption[];
  tenures: readonly SurveyOption[];
};

/** Integer percent of respondents. Multi-select buckets can sum past 100. */
export function percentOf(count: number, n: number): number {
  if (n <= 0) return 0;
  return Math.round((count / n) * 100);
}

function buckets(
  rows: readonly SurveyAnswer[],
  options: readonly SurveyOption[],
  pick: (row: SurveyAnswer) => readonly string[],
): Bucket[] {
  const counts = new Map(options.map((option) => [option.id, 0]));
  const extra = new Map<string, number>();
  for (const row of rows) {
    const seen = new Set<string>();
    for (const id of pick(row)) {
      if (seen.has(id)) continue;
      seen.add(id);
      if (counts.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
      else extra.set(id, (extra.get(id) ?? 0) + 1);
    }
  }
  const n = rows.length;
  const known = options.map((option) => {
    const count = counts.get(option.id) ?? 0;
    return { id: option.id, label: option.label, count, percent: percentOf(count, n) };
  });
  const rest = [...extra.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "ko"))
    .map(([id, count]) => ({ id, label: id, count, percent: percentOf(count, n) }));
  return [...known, ...rest];
}

/**
 * Counts real rows only. Below the threshold the breakdown arrays stay empty so a
 * page cannot render invented zeros as if they were a result.
 */
export function aggregateSurvey(rows: readonly SurveyAnswer[], catalog: SurveyCatalog): SurveyResults {
  const n = rows.length;
  const published = n >= PUBLISH_AT;
  if (!published) {
    return { n, threshold: PUBLISH_AT, published: false, agents: [], models: [], uses: [], tenures: [] };
  }
  return {
    n,
    threshold: PUBLISH_AT,
    published: true,
    agents: buckets(rows, catalog.agents, (row) => row.agents),
    models: buckets(rows, catalog.models, (row) => [row.model]),
    uses: buckets(rows, catalog.uses, (row) => row.uses),
    tenures: buckets(rows, catalog.tenures, (row) => [row.tenure]),
  };
}
