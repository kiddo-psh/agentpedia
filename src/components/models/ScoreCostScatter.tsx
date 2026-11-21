import Link from "next/link";
import { paretoFrontier, type ScatterPoint } from "./metrics";

/** Stable harness → tone index so colors come from theme CSS, not fixed hex. */
const HARNESS_TONE: Record<string, number> = {
  "GitHub Copilot": 0,
  "Claude Code": 1,
  Codex: 2,
  "Antigravity CLI": 3,
  "Grok Build": 4,
};

function harnessTone(harness: string): number {
  return HARNESS_TONE[harness] ?? 5;
}

function logScale(value: number, min: number, max: number): number {
  const lo = Math.log10(Math.max(min, Number.EPSILON));
  const hi = Math.log10(Math.max(max, min * 1.01));
  return (Math.log10(Math.max(value, Number.EPSILON)) - lo) / Math.max(hi - lo, Number.EPSILON);
}

export function ScoreCostScatter({
  points,
  highlightId,
  compact = false,
}: {
  points: ScatterPoint[];
  highlightId?: string;
  compact?: boolean;
}) {
  if (points.length === 0) {
    return <p className="text-sm text-muted">해결률과 비용이 모두 확인된 모델이 아직 없습니다.</p>;
  }

  const width = compact ? 360 : 720;
  const height = compact ? 220 : 340;
  const pad = compact
    ? { top: 16, right: 16, bottom: 36, left: 40 }
    : { top: 20, right: 24, bottom: 44, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const margins = points.map((p) => p.margin ?? 0);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys.map((y, i) => y - margins[i]!), 0);
  const yMax = Math.max(...ys.map((y, i) => y + margins[i]!));
  const ySpan = Math.max(yMax - yMin, 1);

  const project = (p: ScatterPoint) => ({
    cx: pad.left + logScale(p.x, xMin, xMax) * innerW,
    cy: pad.top + (1 - (p.y - yMin) / ySpan) * innerH,
  });

  const frontier = paretoFrontier(points);
  const frontierPath = frontier
    .map((p, i) => {
      const { cx, cy } = project(p);
      return `${i === 0 ? "M" : "L"} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    })
    .join(" ");

  const harnesses = [...new Set(points.map((p) => p.harness))];
  const xTicks = [xMin, Math.exp(Math.log(xMin) * 0.5 + Math.log(xMax) * 0.5), xMax].filter(
    (v, i, arr) => arr.findIndex((x) => Math.abs(x - v) / v < 0.05) === i,
  );

  return (
    <div className="models-scatter">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="models-scatter-svg h-auto w-full"
        role="img"
        aria-label="모델별 해결률과 전체 실행 비용 산점도"
      >
        <line
          x1={pad.left}
          y1={pad.top + innerH}
          x2={pad.left + innerW}
          y2={pad.top + innerH}
          stroke="currentColor"
          strokeOpacity="0.2"
        />
        <line
          x1={pad.left}
          y1={pad.top}
          x2={pad.left}
          y2={pad.top + innerH}
          stroke="currentColor"
          strokeOpacity="0.2"
        />
        {xTicks.map((tick) => {
          const x = pad.left + logScale(tick, xMin, xMax) * innerW;
          return (
            <g key={tick}>
              <line
                x1={x}
                y1={pad.top}
                x2={x}
                y2={pad.top + innerH}
                stroke="currentColor"
                strokeOpacity="0.06"
              />
              <text x={x} y={height - 12} textAnchor="middle" className="models-scatter-axis">
                {tick >= 1000 ? `$${(tick / 1000).toFixed(tick % 1000 === 0 ? 0 : 1)}k` : `$${Math.round(tick)}`}
              </text>
            </g>
          );
        })}
        <text x={pad.left - 8} y={pad.top + 4} textAnchor="end" className="models-scatter-axis">
          {Math.round(yMax)}%
        </text>
        <text x={pad.left - 8} y={pad.top + innerH} textAnchor="end" className="models-scatter-axis">
          {Math.round(yMin)}%
        </text>
        {!compact ? (
          <>
            <text x={pad.left + innerW / 2} y={height - 2} textAnchor="middle" className="models-scatter-axis">
              전체 실행 비용(달러, 로그 눈금)
            </text>
            <text
              x={14}
              y={pad.top + innerH / 2}
              textAnchor="middle"
              className="models-scatter-axis"
              transform={`rotate(-90 14 ${pad.top + innerH / 2})`}
            >
              해결률(%)
            </text>
          </>
        ) : null}

        {frontierPath ? (
          <path d={frontierPath} fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
        ) : null}

        {points.map((point) => {
          const { cx, cy } = project(point);
          const hi = highlightId === point.id;
          const m = point.margin ?? 0;
          const tone = harnessTone(point.harness);
          const yTop = pad.top + (1 - (point.y + m - yMin) / ySpan) * innerH;
          const yBot = pad.top + (1 - (point.y - m - yMin) / ySpan) * innerH;
          return (
            <g
              key={point.id}
              className={
                hi
                  ? `models-scatter-point models-scatter-tone-${tone} is-hot`
                  : `models-scatter-point models-scatter-tone-${tone}`
              }
            >
              {m > 0 ? (
                <line
                  x1={cx}
                  y1={yTop}
                  x2={cx}
                  y2={yBot}
                  className="models-scatter-ci"
                  strokeWidth={hi ? 2 : 1}
                />
              ) : null}
              <a href={point.href}>
                <title>
                  {point.name}
                  {point.effort ? ` (${point.effort})` : ""} · {point.harness} · {point.y}%
                  {point.margin != null ? ` ± ${point.margin}` : ""} · ${point.x.toLocaleString("en-US")}
                </title>
                <circle cx={cx} cy={cy} r={hi ? 6 : 4.5} className="models-scatter-dot" />
              </a>
              {!compact && (hi || point.y >= yMax - 1 || frontier.some((f) => f.id === point.id)) ? (
                <text x={cx + 8} y={cy - 8} className="models-scatter-label">
                  {point.name.replace(/^Claude |^GPT-|^Gemini /, "")}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <ul className="models-scatter-legend mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
        {harnesses.map((harness) => (
          <li key={harness} className="inline-flex items-center gap-1.5">
            <span
              className={`models-scatter-swatch models-scatter-tone-${harnessTone(harness)}`}
              aria-hidden
            />
            {harness}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <span className="inline-block h-px w-4 bg-foreground/40" aria-hidden />
          <span title="Pareto 전선. 이 선 위의 모델보다 더 싸면서 더 많이 푸는 모델은 없습니다.">
            가성비 경계선
          </span>
        </li>
      </ul>
      {!compact ? (
        <p className="mt-2 text-[12px] text-muted">
          세로 막대는 해결률의 오차 범위입니다. 가로축은 전체 실행 비용이며 로그 눈금입니다.
        </p>
      ) : (
        <p className="mt-2 text-[12px] text-muted">
          <Link href="/models" prefetch={true} className="underline underline-offset-2">
            전체 모델과 비교하기
          </Link>
        </p>
      )}
    </div>
  );
}
