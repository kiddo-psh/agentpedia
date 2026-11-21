import Link from "next/link";
import { SourceAge } from "@/components/SourceAge";
import { formatDate } from "@/content/labels";
import type { TimingViewRow } from "./metrics";

export function OtherBenchmarks({
  rows,
  asOfIso,
  sourceUrl,
}: {
  rows: TimingViewRow[];
  asOfIso: string | null;
  sourceUrl: string;
}) {
  if (rows.length === 0) return null;

  return (
    <details className="models-other mt-14 border-t border-line pt-8">
      <summary className="cursor-pointer text-[22px] font-semibold tracking-tight">다른 벤치마크</summary>
      <p className="mt-3 max-w-[48em] text-sm leading-relaxed text-muted">
        Vals SWE-bench Verified · Mini-SWE-agent 작업당 시간입니다. Terminal-Bench와 모델 버전·하네스가 달라
        같은 이름 계열(예: Grok 4.6)이라도 수치가 크게 어긋날 수 있습니다. 모델 페이지 링크는 이름이 정확히 같을
        때만 붙입니다.
      </p>
      <ul className="mt-6 border-b border-line">
        {rows.map((row) => {
          const body = (
            <>
              <span>
                <span className="text-[15px] font-medium">{row.name}</span>
                <span className="mt-0.5 block text-[12px] text-muted">
                  {row.vendor} · {row.score}% · {row.costDisplay}/test
                </span>
              </span>
              <span className="tabular-nums text-sm font-medium">{row.durationDisplay}</span>
            </>
          );
          return (
            <li key={row.id} className="border-t border-line">
              {row.href ? (
                <Link
                  href={row.href}
                  prefetch={true}
                  className="flex items-baseline justify-between gap-4 py-3.5 hover:bg-foreground/[0.03]"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex items-baseline justify-between gap-4 py-3.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <span>출처</span>
        <a href={sourceUrl} className="underline underline-offset-2" target="_blank" rel="noreferrer">
          vals.ai/benchmarks/swebench
        </a>
        {asOfIso ? (
          <>
            <span aria-hidden>·</span>
            <span>기준일 {formatDate(new Date(asOfIso))}</span>
            <SourceAge newestIso={asOfIso} />
          </>
        ) : null}
      </p>
    </details>
  );
}
