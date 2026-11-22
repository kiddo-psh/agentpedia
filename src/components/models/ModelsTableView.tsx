import { EMPTY } from "./format";
import type { ModelTableRow } from "./metrics";

function MiniBar({ value }: { value: number | null }) {
  if (value === null) return <span className="models-mini-bar is-empty" aria-hidden />;
  return (
    <span className="models-mini-bar" aria-hidden>
      <span className="models-mini-bar-fill" style={{ ["--bar" as string]: String(value) }} />
    </span>
  );
}

function EffortBadge({ effort }: { effort: string | null }) {
  if (!effort) return null;
  return <span className="models-effort">{effort}</span>;
}

export function ModelsTableDesktopBody({ rows }: { rows: ModelTableRow[] }) {
  return (
    <tbody>
      {rows.map((row) => (
        <tr key={row.slug} className="border-t border-line align-top">
          <td className="py-3 pr-3 tabular-nums text-muted">{row.rank ?? "—"}</td>
          <td className="py-3 pr-3">
            <a href={row.href} className="font-medium hover:underline">
              {row.name}
            </a>
            <EffortBadge effort={row.effort} />
          </td>
          <td className="py-3 pr-3 text-muted">{row.vendor}</td>
          <td className="py-3 pr-3 text-muted">{row.harness ?? EMPTY}</td>
          <td className="py-3 pr-3">
            <div className="tabular-nums font-medium">{row.scoreDisplay}</div>
            <MiniBar value={row.scoreBar} />
          </td>
          <td className="py-3 pr-3">
            <div className="tabular-nums">{row.runCostDisplay}</div>
            <MiniBar value={row.runCostBar} />
          </td>
          <td className="py-3 pr-3">
            <div className="tabular-nums">{row.tokensDisplay}</div>
            <MiniBar value={row.tokensBar} />
          </td>
          <td className="py-3 pr-3 tabular-nums">{row.inputDisplay}</td>
          <td className="py-3 tabular-nums">{row.outputDisplay}</td>
        </tr>
      ))}
    </tbody>
  );
}

export function ModelsTableMobileList({ rows }: { rows: ModelTableRow[] }) {
  return (
    <ul className="models-card-list mt-4 space-y-3 md:hidden">
      {rows.map((row) => (
        <li key={row.slug} className="models-card border-t border-line pt-3">
          <a href={row.href} className="block">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-medium">
                {row.rank != null ? `${row.rank}. ` : ""}
                {row.name}
                <EffortBadge effort={row.effort} />
              </span>
              <span className="tabular-nums text-sm font-medium">{row.scoreDisplay}</span>
            </div>
            <p className="mt-1 text-[12px] text-muted">
              {row.vendor}
              {row.harness ? ` · ${row.harness}` : ""}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
              <div>
                <dt className="text-muted">전체 실행 비용</dt>
                <dd className="tabular-nums">{row.runCostDisplay}</dd>
              </div>
              <div>
                <dt className="text-muted">사용 토큰</dt>
                <dd className="tabular-nums">{row.tokensDisplay}</dd>
              </div>
              <div>
                <dt className="text-muted" title="100만 토큰당 달러">
                  입력 단가
                </dt>
                <dd className="tabular-nums">{row.inputDisplay}</dd>
              </div>
              <div>
                <dt className="text-muted" title="100만 토큰당 달러">
                  출력 단가
                </dt>
                <dd className="tabular-nums">{row.outputDisplay}</dd>
              </div>
            </dl>
          </a>
        </li>
      ))}
    </ul>
  );
}
