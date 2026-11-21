import Link from "next/link";
import { paretoFrontier, type ScatterPoint } from "./metrics";

const HARNESS_COLORS: Record<string, string> = {
  "GitHub Copilot": "#0d0d0d",
  "Claude Code": "#5b5b5b",
  Codex: "#8a8a8a",
  "Antigravity CLI": "#3d3d3d",
  "Grok Build": "#6e6e6e",
};

function harnessColor(harness: string): string {
  return HARNESS_COLORS[harness] ?? "#4a4a4a";
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
    return <p className="text-sm text-muted">해결률과 런 비용을 모두 확인한 모델이 없습니다.</p>;
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
        aria-label="해결률 대 벤치마크 전체 런 비용 산점도"
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
              벤치마크 전체 런 비용 (로그)
            </text>
            <text
              x={14}
              y={pad.top + innerH / 2}
              textAnchor="middle"
              className="models-scatter-axis"
              transform={`rotate(-90 14 ${pad.top + innerH / 2})`}
            >
              해결률
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
          const yTop = pad.top + (1 - (point.y + m - yMin) / ySpan) * innerH;
          const yBot = pad.top + (1 - (point.y - m - yMin) / ySpan) * innerH;
          return (
            <g key={point.id} className={hi ? "models-scatter-point is-hot" : "models-scatter-point"}>
              {m > 0 ? (
                <line
                  x1={cx}
                  y1={yTop}
                  x2={cx}
                  y2={yBot}
                  stroke={harnessColor(point.harness)}
                  strokeOpacity={hi ? 0.9 : 0.45}
                  strokeWidth={hi ? 2 : 1}
                />
              ) : null}
              <a href={point.href}>
                <title>
                  {point.name}
                  {point.effort ? ` (${point.effort})` : ""} · {point.harness} · {point.y}%
                  {point.margin != null ? ` ± ${point.margin}` : ""} · ${point.x.toLocaleString("en-US")}
                </title>
                <circle
                  cx={cx}
                  cy={cy}
                  r={hi ? 6 : 4.5}
                  fill={harnessColor(point.harness)}
                  fillOpacity={hi ? 1 : 0.85}
                />
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
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: harnessColor(harness) }}
              aria-hidden
            />
            {harness}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <span className="inline-block h-px w-4 bg-foreground/40" aria-hidden />
          Pareto 전선
        </li>
      </ul>
      {!compact ? (
        <p className="mt-2 text-[12px] text-muted">
          점마다 세로 막대는 해결률 ±오차입니다. 가로축은 벤치마크{" "}
          <strong className="font-medium text-foreground">전체 런 비용</strong>
          (로그 스케일)입니다.
        </p>
      ) : (
        <p className="mt-2 text-[12px] text-muted">
          <Link href="/models" prefetch={true} className="underline underline-offset-2">
            전체 산점도
          </Link>
        </p>
      )}
    </div>
  );
}
