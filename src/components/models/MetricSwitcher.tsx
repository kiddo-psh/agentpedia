"use client";

import { useState } from "react";
import { SourceAge } from "@/components/SourceAge";
import { formatDate } from "@/content/labels";
import { LeaderboardRow } from "./LeaderboardRow";
import { METRICS, type LeaderboardPayload, type MetricId } from "./metrics";

export function MetricSwitcher({ payload }: { payload: LeaderboardPayload }) {
  const [metric, setMetric] = useState<MetricId>(payload.defaultMetric);
  const board = payload.boards[metric];
  const def = METRICS.find((m) => m.id === metric)!;

  return (
    <div className="models-board">
      <div className="models-metric-tabs" role="tablist" aria-label="비교 지표">
        {METRICS.map((m) => {
          const active = m.id === metric;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={active ? "models-metric-tab is-active" : "models-metric-tab"}
              onClick={() => setMetric(m.id)}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted">{def.blurb}</p>
      <p className="mt-1 text-[12px] text-muted">{def.unit}</p>

      {board.rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted">확인한 값이 없습니다.</p>
      ) : (
        <ol key={metric} className="models-list mt-6 border-b border-line" aria-label={`${def.label} 순위`}>
          {board.rows.map((row, index) => (
            <LeaderboardRow key={row.id} row={row} index={index} />
          ))}
        </ol>
      )}

      <footer className="models-footnote mt-5 text-sm text-muted">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>출처</span>
          {board.sourceUrl ? (
            <a href={board.sourceUrl} className="underline underline-offset-2" target="_blank" rel="noreferrer">
              {board.sourceLabel}
            </a>
          ) : (
            <span>{board.sourceLabel}</span>
          )}
          {board.asOfIso ? (
            <>
              <span aria-hidden>·</span>
              <span>기준일 {formatDate(new Date(board.asOfIso))}</span>
              <SourceAge newestIso={board.asOfIso} />
            </>
          ) : null}
        </p>
      </footer>
    </div>
  );
}
