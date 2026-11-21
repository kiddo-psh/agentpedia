import type { Model } from "@/content/schema";
import { EMPTY, formatPercent, formatTokensBillions, formatUsd } from "./format";

const TB = "Terminal-Bench";
const TB_VERSION = "4.1";

export type SortKey =
  | "rank"
  | "name"
  | "vendor"
  | "harness"
  | "score"
  | "runCost"
  | "tokens"
  | "inputPrice"
  | "outputPrice";

export type ModelTableRow = {
  slug: string;
  name: string;
  vendor: string;
  href: string;
  /** Effort token from the Terminal-Bench model label, e.g. max / high / xhigh. */
  effort: string | null;
  harness: string | null;
  score: number | null;
  margin: number | null;
  /** Competition rank by score (ties share; next skips). */
  rank: number | null;
  runCostUsd: number | null;
  tokensBillions: number | null;
  inputUsd: number | null;
  outputUsd: number | null;
  scoreDisplay: string;
  runCostDisplay: string;
  tokensDisplay: string;
  inputDisplay: string;
  outputDisplay: string;
  /** Bar fill 0–1 proportional to the raw value (value / max), never inverted. */
  scoreBar: number | null;
  runCostBar: number | null;
  tokensBar: number | null;
  inputBar: number | null;
  outputBar: number | null;
};

export type SourceMeta = {
  label: string;
  url: string | null;
  asOfIso: string | null;
};

export type ModelsTablePayload = {
  rows: ModelTableRow[];
  harnesses: string[];
  terminalBench: SourceMeta;
  openRouter: SourceMeta;
};

export type ScatterPoint = {
  id: string;
  name: string;
  href: string;
  harness: string;
  /** Run cost USD (x). */
  x: number;
  /** Resolve rate % (y). */
  y: number;
  /** Half-width of CI in percentage points. */
  margin: number | null;
  effort: string | null;
};

export type WhichPick = {
  kind: "performance" | "value" | "cheap";
  title: string;
  rule: string;
  slug: string;
  name: string;
  href: string;
  detail: string;
};

/** Pull effort from a leaderboard model label like `Opus 5.5 (max)`. */
export function parseEffort(modelLabel: string | undefined | null): string | null {
  if (!modelLabel) return null;
  const match = modelLabel.match(/\(([^)]+)\)\s*$/);
  return match?.[1]?.trim() || null;
}

function terminalBench(model: Model) {
  return model.benchmarks.find((b) => b.bench === TB && b.version === TB_VERSION);
}

function newestIso(dates: Date[]): string | null {
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString();
}

/**
 * Competition ranking: ties share the first place in the group; the next distinct
 * value skips ahead (1, 2, 2, 4). Null values get null ranks.
 */
export function competitionRanks(
  items: ReadonlyArray<{ id: string; value: number | null }>,
  higherIsBetter: boolean,
): Map<string, number | null> {
  const ranked = new Map<string, number | null>();
  const withValue = items.filter((item): item is { id: string; value: number } => item.value !== null);
  withValue.sort((a, b) => (higherIsBetter ? b.value - a.value : a.value - b.value) || a.id.localeCompare(b.id));
  let i = 0;
  while (i < withValue.length) {
    let j = i + 1;
    while (j < withValue.length && withValue[j]!.value === withValue[i]!.value) j += 1;
    const rank = i + 1;
    for (let k = i; k < j; k += 1) ranked.set(withValue[k]!.id, rank);
    i = j;
  }
  for (const item of items) {
    if (!ranked.has(item.id)) ranked.set(item.id, null);
  }
  return ranked;
}

/** Bar length proportional to magnitude: value / max among peers. Never invert. */
export function proportionalBars(values: ReadonlyArray<number | null>): Array<number | null> {
  const numeric = values.filter((v): v is number => v !== null);
  if (numeric.length === 0) return values.map(() => null);
  const max = Math.max(...numeric);
  if (max <= 0) return values.map((v) => (v === null ? null : 1));
  return values.map((v) => (v === null ? null : Math.max(0.06, v / max)));
}

/**
 * 2D Pareto frontier for minimize x (cost) and maximize y (score).
 * Sort by ascending x; keep points that strictly improve the best y so far.
 */
export function paretoFrontier<T extends { x: number; y: number }>(points: ReadonlyArray<T>): T[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || b.y - a.y);
  const frontier: T[] = [];
  let bestY = -Infinity;
  for (const point of sorted) {
    if (point.y > bestY) {
      frontier.push(point);
      bestY = point.y;
    }
  }
  return frontier;
}

export function buildModelsTable(models: Model[]): ModelsTablePayload {
  const tbDates: Date[] = [];
  const priceDates: Date[] = [];
  let tbUrl: string | null = null;
  let priceUrl: string | null = null;

  const base = models.map((model) => {
    const tb = terminalBench(model);
    if (tb) {
      tbDates.push(tb.asOf);
      tbUrl ??= tb.url;
    }
    if (model.inputUsdPerMTok) {
      priceDates.push(model.inputUsdPerMTok.asOf);
      priceUrl ??= model.inputUsdPerMTok.sourceUrl;
    }
    if (model.outputUsdPerMTok) {
      priceDates.push(model.outputUsdPerMTok.asOf);
      priceUrl ??= model.outputUsdPerMTok.sourceUrl;
    }
    return {
      slug: model.slug,
      name: model.name,
      vendor: model.vendor,
      href: `/models/${model.slug}`,
      effort: parseEffort(tb?.model),
      harness: tb?.agentHarness ?? null,
      score: tb?.score ?? null,
      margin: tb?.margin ?? null,
      runCostUsd: tb?.costUsd ?? null,
      tokensBillions: tb?.tokensBillions ?? null,
      inputUsd: model.inputUsdPerMTok?.value ?? null,
      outputUsd: model.outputUsdPerMTok?.value ?? null,
      scoreDisplay: tb ? formatPercent(tb.score, tb.margin) : EMPTY,
      runCostDisplay: tb?.costUsd !== undefined ? formatUsd(tb.costUsd) : EMPTY,
      tokensDisplay: tb?.tokensBillions !== undefined ? formatTokensBillions(tb.tokensBillions) : EMPTY,
      inputDisplay: model.inputUsdPerMTok ? formatUsd(model.inputUsdPerMTok.value) : EMPTY,
      outputDisplay: model.outputUsdPerMTok ? formatUsd(model.outputUsdPerMTok.value) : EMPTY,
    };
  });

  const ranks = competitionRanks(
    base.map((row) => ({ id: row.slug, value: row.score })),
    true,
  );
  const scoreBars = proportionalBars(base.map((r) => r.score));
  const runCostBars = proportionalBars(base.map((r) => r.runCostUsd));
  const tokensBars = proportionalBars(base.map((r) => r.tokensBillions));
  const inputBars = proportionalBars(base.map((r) => r.inputUsd));
  const outputBars = proportionalBars(base.map((r) => r.outputUsd));

  const rows: ModelTableRow[] = base
    .map((row, i) => ({
      ...row,
      rank: ranks.get(row.slug) ?? null,
      scoreBar: scoreBars[i]!,
      runCostBar: runCostBars[i]!,
      tokensBar: tokensBars[i]!,
      inputBar: inputBars[i]!,
      outputBar: outputBars[i]!,
    }))
    .sort((a, b) => {
      if (a.rank === null && b.rank === null) return a.name.localeCompare(b.name, "ko");
      if (a.rank === null) return 1;
      if (b.rank === null) return -1;
      return a.rank - b.rank || b.score! - a.score! || a.name.localeCompare(b.name, "ko");
    });

  const harnesses = [...new Set(rows.map((r) => r.harness).filter((h): h is string => Boolean(h)))].sort((a, b) =>
    a.localeCompare(b, "ko"),
  );

  return {
    rows,
    harnesses,
    terminalBench: {
      label: "tbench.ai/leaderboard",
      url: tbUrl,
      asOfIso: newestIso(tbDates),
    },
    openRouter: {
      label: "OpenRouter",
      url: priceUrl,
      asOfIso: newestIso(priceDates),
    },
  };
}

export function buildScatterPoints(rows: ReadonlyArray<ModelTableRow>): ScatterPoint[] {
  return rows
    .filter((row): row is ModelTableRow & { runCostUsd: number; score: number; harness: string } =>
      row.runCostUsd !== null && row.score !== null && row.harness !== null,
    )
    .map((row) => ({
      id: row.slug,
      name: row.name,
      href: row.href,
      harness: row.harness,
      x: row.runCostUsd,
      y: row.score,
      margin: row.margin,
      effort: row.effort,
    }));
}

/**
 * Top half by resolve rate, including every model tied with the cutoff.
 * Index `floor((n - 1) / 2)` is the last place that still counts as the top half.
 */
export function topHalfByResolve(points: ReadonlyArray<ScatterPoint>): ScatterPoint[] {
  if (points.length === 0) return [];
  const ranked = [...points].sort((a, b) => b.y - a.y || a.x - b.x);
  const cutoff = ranked[Math.floor((ranked.length - 1) / 2)]!.y;
  return ranked.filter((point) => point.y >= cutoff);
}

export function pickWhichModels(points: ReadonlyArray<ScatterPoint>): WhichPick[] {
  if (points.length === 0) return [];
  const best = [...points].sort((a, b) => b.y - a.y || a.x - b.x)[0]!;
  const cheap = [...topHalfByResolve(points)].sort((a, b) => a.x - b.x || b.y - a.y)[0]!;
  const frontier = paretoFrontier(points);
  const value =
    [...frontier].sort((a, b) => b.y / b.x - a.y / a.x || b.y - a.y)[0] ?? best;

  return [
    {
      kind: "performance",
      title: "해결률이 가장 높은 모델",
      rule: "Terminal-Bench 해결률이 가장 높은 모델입니다.",
      slug: best.id,
      name: best.name,
      href: best.href,
      detail: formatPercent(best.y, best.margin ?? undefined),
    },
    {
      kind: "value",
      title: "가성비가 좋은 모델",
      rule: "가성비 경계선 위 모델 가운데 비용 1달러당 해결률이 가장 높은 모델입니다.",
      slug: value.id,
      name: value.name,
      href: value.href,
      detail: `${formatPercent(value.y, value.margin ?? undefined)} · ${formatUsd(value.x)}`,
    },
    {
      kind: "cheap",
      title: "실행 비용이 가장 낮은 모델",
      rule: "해결률 상위 절반 안에서 전체 실행 비용이 가장 낮은 모델입니다.",
      slug: cheap.id,
      name: cheap.name,
      href: cheap.href,
      detail: `${formatUsd(cheap.x)} · ${formatPercent(cheap.y, cheap.margin ?? undefined)}`,
    },
  ];
}

export function compareRows(a: ModelTableRow, b: ModelTableRow, key: SortKey, dir: "asc" | "desc"): number {
  const sign = dir === "asc" ? 1 : -1;
  const nullLast = (av: number | null, bv: number | null) => {
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return (av - bv) * sign;
  };
  switch (key) {
    case "rank":
      return nullLast(a.rank, b.rank) || a.name.localeCompare(b.name, "ko");
    case "name":
      return a.name.localeCompare(b.name, "ko") * sign;
    case "vendor":
      return a.vendor.localeCompare(b.vendor, "ko") * sign || a.name.localeCompare(b.name, "ko");
    case "harness":
      return (a.harness ?? "").localeCompare(b.harness ?? "", "ko") * sign || a.name.localeCompare(b.name, "ko");
    case "score":
      return nullLast(a.score, b.score) || a.name.localeCompare(b.name, "ko");
    case "runCost":
      return nullLast(a.runCostUsd, b.runCostUsd) || a.name.localeCompare(b.name, "ko");
    case "tokens":
      return nullLast(a.tokensBillions, b.tokensBillions) || a.name.localeCompare(b.name, "ko");
    case "inputPrice":
      return nullLast(a.inputUsd, b.inputUsd) || a.name.localeCompare(b.name, "ko");
    case "outputPrice":
      return nullLast(a.outputUsd, b.outputUsd) || a.name.localeCompare(b.name, "ko");
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}
