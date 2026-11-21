import type { TaskTimingRow } from "@/content/models";
import type { Model } from "@/content/schema";
import { EMPTY, formatDuration, formatPercent, formatTokensBillions, formatUsd } from "./format";

export const METRIC_IDS = ["score", "runCost", "tokens", "inputPrice", "outputPrice", "taskTime"] as const;
export type MetricId = (typeof METRIC_IDS)[number];

export type MetricDef = {
  id: MetricId;
  label: string;
  /** Short unit line under the active metric. */
  unit: string;
  /** One-line explanation under the tabs. */
  blurb: string;
  /** Higher rank when value is larger (해결률) vs smaller (비용·시간). */
  higherIsBetter: boolean;
};

export const METRICS: readonly MetricDef[] = [
  {
    id: "score",
    label: "해결률",
    unit: "Terminal-Bench 4.1 · %",
    blurb: "행마다 에이전트 하네스가 다릅니다. 모델만 비교한 값이 아니라, 그 제품으로 잰 값입니다.",
    higherIsBetter: true,
  },
  {
    id: "runCost",
    label: "런 비용",
    unit: "Terminal-Bench 4.1 · USD",
    blurb: "리더보드가 찍은 전체 런 비용입니다. 확인하지 못한 칸은 비워 둡니다.",
    higherIsBetter: false,
  },
  {
    id: "tokens",
    label: "토큰",
    unit: "Terminal-Bench 4.1 · 십억(B)",
    blurb: "리더보드가 찍은 전체 토큰량입니다.",
    higherIsBetter: false,
  },
  {
    id: "inputPrice",
    label: "입력 $/1M",
    unit: "OpenRouter · USD / 1M tokens",
    blurb: "백만 입력 토큰당 목록 가격입니다. 캐시·할인은 반영하지 않았습니다.",
    higherIsBetter: false,
  },
  {
    id: "outputPrice",
    label: "출력 $/1M",
    unit: "OpenRouter · USD / 1M tokens",
    blurb: "백만 출력 토큰당 목록 가격입니다. 캐시·할인은 반영하지 않았습니다.",
    higherIsBetter: false,
  },
  {
    id: "taskTime",
    label: "작업당 시간",
    unit: "Vals SWE-bench Verified · Mini-SWE-agent",
    blurb: "보드가 2026-09-01에 갱신을 멈춰서 Terminal-Bench 모델과 버전이 다를 수 있습니다.",
    higherIsBetter: false,
  },
] as const;

export type LeaderboardRowData = {
  id: string;
  /** Rank among rows with a value; null when value is missing. */
  rank: number | null;
  name: string;
  vendor: string;
  href: string | null;
  value: number | null;
  display: string;
  detail: string | null;
  /** 0–1 bar fill; null when no value. */
  bar: number | null;
};

export type MetricBoard = {
  metric: MetricId;
  rows: LeaderboardRowData[];
  /** Newest asOf ISO among rows that contributed a value, when any. */
  asOfIso: string | null;
  sourceLabel: string;
  sourceUrl: string | null;
};

export type LeaderboardPayload = {
  boards: Record<MetricId, MetricBoard>;
  defaultMetric: MetricId;
};

const TB = "Terminal-Bench";
const TB_VERSION = "4.1";

function terminalBench(model: Model) {
  return model.benchmarks.find((b) => b.bench === TB && b.version === TB_VERSION);
}

function sortRows(rows: LeaderboardRowData[], higherIsBetter: boolean): LeaderboardRowData[] {
  const withValue = rows.filter((r) => r.value !== null);
  const without = rows.filter((r) => r.value === null);
  withValue.sort((a, b) => {
    const av = a.value!;
    const bv = b.value!;
    return higherIsBetter ? bv - av : av - bv;
  });
  const ranked = withValue.map((row, i) => ({ ...row, rank: i + 1 }));
  return [...ranked, ...without.map((row) => ({ ...row, rank: null }))];
}

function withBars(rows: LeaderboardRowData[], higherIsBetter: boolean): LeaderboardRowData[] {
  const values = rows.map((r) => r.value).filter((v): v is number => v !== null);
  if (values.length === 0) return rows;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(max - min, Number.EPSILON);
  return rows.map((row) => {
    if (row.value === null) return { ...row, bar: null };
    // Score: longer bar for higher. Cost/time: longer bar for lower relative to peers.
    if (higherIsBetter) return { ...row, bar: Math.max(0.06, row.value / max) };
    if (max === min) return { ...row, bar: 1 };
    return { ...row, bar: Math.max(0.06, (max - row.value) / span) };
  });
}

function newestIso(dates: Date[]): string | null {
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString();
}

function buildModelMetric(
  models: Model[],
  metric: MetricId,
  def: MetricDef,
  pick: (model: Model) => {
    value: number | null;
    display: string;
    detail: string | null;
    asOf: Date | null;
    sourceUrl: string | null;
  },
  sourceLabel: string,
): MetricBoard {
  const asOfs: Date[] = [];
  let sourceUrl: string | null = null;
  const base: LeaderboardRowData[] = models.map((model) => {
    const cell = pick(model);
    if (cell.value !== null) {
      if (cell.asOf) asOfs.push(cell.asOf);
      if (!sourceUrl && cell.sourceUrl) sourceUrl = cell.sourceUrl;
    }
    return {
      id: model.slug,
      rank: null,
      name: model.name,
      vendor: model.vendor,
      href: `/models/${model.slug}`,
      value: cell.value,
      display: cell.display,
      detail: cell.detail,
      bar: null,
    };
  });
  return {
    metric,
    rows: withBars(sortRows(base, def.higherIsBetter), def.higherIsBetter),
    asOfIso: newestIso(asOfs),
    sourceLabel,
    sourceUrl,
  };
}

function buildTaskTimeBoard(models: Model[], timing: TaskTimingRow[], def: MetricDef): MetricBoard {
  const byName = new Map(models.map((m) => [m.name, m.slug]));
  const rows: LeaderboardRowData[] = timing.map((row) => {
    const slug = byName.get(row.model);
    return {
      id: slug ?? `timing:${row.model}`,
      rank: null,
      name: row.model,
      vendor: row.vendor,
      href: slug ? `/models/${slug}` : null,
      value: row.durationSec,
      display: formatDuration(row.durationSec),
      detail: `${row.score}% · ${formatUsd(row.costUsd)}/test`,
      bar: null,
    };
  });
  const ranked = withBars(sortRows(rows, def.higherIsBetter), def.higherIsBetter);
  return {
    metric: "taskTime",
    rows: ranked,
    asOfIso: newestIso(timing.map((r) => r.asOf)),
    sourceLabel: "vals.ai/benchmarks/swebench",
    sourceUrl: timing[0]?.url ?? "https://www.vals.ai/benchmarks/swebench",
  };
}

/** Build all metric boards from sourced model + timing data. */
export function buildLeaderboard(models: Model[], timing: TaskTimingRow[]): LeaderboardPayload {
  const byId = Object.fromEntries(METRICS.map((m) => [m.id, m])) as Record<MetricId, MetricDef>;

  const boards: Record<MetricId, MetricBoard> = {
    score: buildModelMetric(
      models,
      "score",
      byId.score,
      (model) => {
        const tb = terminalBench(model);
        if (!tb) return { value: null, display: EMPTY, detail: null, asOf: null, sourceUrl: null };
        return {
          value: tb.score,
          display: formatPercent(tb.score, tb.margin),
          detail: tb.agentHarness,
          asOf: tb.asOf,
          sourceUrl: tb.url,
        };
      },
      "tbench.ai/leaderboard",
    ),
    runCost: buildModelMetric(
      models,
      "runCost",
      byId.runCost,
      (model) => {
        const tb = terminalBench(model);
        if (!tb || tb.costUsd === undefined) {
          return { value: null, display: EMPTY, detail: tb?.cost ?? null, asOf: tb?.asOf ?? null, sourceUrl: tb?.url ?? null };
        }
        return {
          value: tb.costUsd,
          display: formatUsd(tb.costUsd),
          detail: tb.agentHarness,
          asOf: tb.asOf,
          sourceUrl: tb.url,
        };
      },
      "tbench.ai/leaderboard",
    ),
    tokens: buildModelMetric(
      models,
      "tokens",
      byId.tokens,
      (model) => {
        const tb = terminalBench(model);
        if (!tb || tb.tokensBillions === undefined) {
          return { value: null, display: EMPTY, detail: null, asOf: tb?.asOf ?? null, sourceUrl: tb?.url ?? null };
        }
        return {
          value: tb.tokensBillions,
          display: formatTokensBillions(tb.tokensBillions),
          detail: tb.agentHarness,
          asOf: tb.asOf,
          sourceUrl: tb.url,
        };
      },
      "tbench.ai/leaderboard",
    ),
    inputPrice: buildModelMetric(
      models,
      "inputPrice",
      byId.inputPrice,
      (model) => {
        const price = model.inputUsdPerMTok;
        if (!price) return { value: null, display: EMPTY, detail: null, asOf: null, sourceUrl: null };
        return {
          value: price.value,
          display: formatUsd(price.value),
          detail: null,
          asOf: price.asOf,
          sourceUrl: price.sourceUrl,
        };
      },
      "OpenRouter",
    ),
    outputPrice: buildModelMetric(
      models,
      "outputPrice",
      byId.outputPrice,
      (model) => {
        const price = model.outputUsdPerMTok;
        if (!price) return { value: null, display: EMPTY, detail: null, asOf: null, sourceUrl: null };
        return {
          value: price.value,
          display: formatUsd(price.value),
          detail: null,
          asOf: price.asOf,
          sourceUrl: price.sourceUrl,
        };
      },
      "OpenRouter",
    ),
    taskTime: buildTaskTimeBoard(models, timing, byId.taskTime),
  };

  return { boards, defaultMetric: "score" };
}
