import type { AgentGroup, SurveyOption } from "./choices";
import type { SurveyAnswer } from "./validate";

export type Bucket = { id: string; label: string; count: number; percent: number };

export type GroupRollup = Bucket & { options: Bucket[] };

export type SurveyResults = {
  n: number;
  agentGroups: GroupRollup[];
  models: Bucket[];
  uses: Bucket[];
  tenures: Bucket[];
};

export type SurveyCatalog = {
  agentGroups: readonly AgentGroup[];
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

/** A person counts once per group, even when they picked several apps in it. */
export function aggregateSurvey(rows: readonly SurveyAnswer[], catalog: SurveyCatalog): SurveyResults {
  const n = rows.length;
  const known = new Set(catalog.agentGroups.flatMap((group) => group.options.map((option) => option.id)));
  const agentGroups: GroupRollup[] = catalog.agentGroups.map((group) => {
    const ids = new Set(group.options.map((option) => option.id));
    let count = 0;
    for (const row of rows) {
      if (row.agents.some((id) => ids.has(id))) count += 1;
    }
    return {
      id: group.id,
      label: group.label,
      count,
      percent: percentOf(count, n),
      options: buckets(rows, group.options, (row) => row.agents.filter((id) => ids.has(id))),
    };
  });
  const stray = new Map<string, number>();
  for (const row of rows) {
    const seen = new Set<string>();
    for (const id of row.agents) {
      if (known.has(id) || seen.has(id)) continue;
      seen.add(id);
      stray.set(id, (stray.get(id) ?? 0) + 1);
    }
  }
  if (stray.size > 0) {
    const options = [...stray.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "ko"))
      .map(([id, count]) => ({ id, label: id, count, percent: percentOf(count, n) }));
    const people = rows.filter((row) => row.agents.some((id) => stray.has(id))).length;
    agentGroups.push({
      id: "unknown",
      label: "기타 응답",
      count: people,
      percent: percentOf(people, n),
      options,
    });
  }
  return {
    n,
    agentGroups,
    models: buckets(rows, catalog.models, (row) => row.models),
    uses: buckets(rows, catalog.uses, (row) => row.uses),
    tenures: buckets(rows, catalog.tenures, (row) => [row.tenure]),
  };
}
