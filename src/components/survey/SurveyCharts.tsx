import type { ReactNode } from "react";
import { leadingBucket, sortedByCount, type Bucket, type SurveyResults } from "@/survey/aggregate";

function Bars({ buckets }: { buckets: readonly Bucket[] }) {
  const ranked = sortedByCount(buckets);
  const leadId = ranked[0]?.count ? ranked[0].id : null;
  return (
    <ul className="mt-4 grid gap-3">
      {ranked.map((bucket) => {
        const lead = bucket.id === leadId;
        return (
          <li key={bucket.id} className="min-h-9">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={lead ? "font-semibold" : "text-muted"}>{bucket.label}</span>
              <span className={`shrink-0 tabular-nums ${lead ? "font-medium" : "text-muted"}`}>
                {bucket.percent}% · {bucket.count}명
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-soft">
              <div
                className={lead ? "h-full bg-foreground" : "h-full bg-foreground/35"}
                style={{ width: `${bucket.percent}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <article className="rounded-xl border border-line p-5">
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {note ? <p className="mt-1 text-xs text-muted">{note}</p> : null}
      {children}
    </article>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-14">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

/** CSS bars in cards. Row height is fixed, so a count change does not move the rows. */
export function SurveyCharts({ results }: { results: SurveyResults }) {
  const topForm = leadingBucket(results.agentGroups);
  const topApp = leadingBucket(results.agentGroups.flatMap((group) => group.options));
  const topModel = leadingBucket(results.models);
  const none = "아직 없음";

  return (
    <section id="survey-results" className="mt-8 scroll-mt-24" aria-labelledby="survey-results-title">
      <h2 id="survey-results-title" className="sr-only">
        응답
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-line p-5 md:col-span-2">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{results.n}명 응답</p>
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryStat label="많이 고른 형태" value={topForm?.label ?? none} />
            <SummaryStat label="많이 고른 앱" value={topApp?.label ?? none} />
            <SummaryStat label="많이 고른 모델" value={topModel?.label ?? none} />
          </dl>
        </article>

        <Card title="형태" note="한 형태를 하나라도 골랐으면 그 막대에 들어갑니다. 합이 100을 넘을 수 있습니다.">
          <Bars buckets={results.agentGroups} />
        </Card>
        {results.agentGroups.map((group) => (
          <Card key={group.id} title={group.label}>
            <Bars buckets={group.options} />
          </Card>
        ))}
        <Card title="선호 모델" note="여러 개를 고를 수 있어서 비율의 합이 100을 넘을 수 있습니다.">
          <Bars buckets={results.models} />
        </Card>
        <Card title="주 용도" note="여러 개를 고를 수 있어서 비율의 합이 100을 넘을 수 있습니다.">
          <Bars buckets={results.uses} />
        </Card>
        <Card title="사용 기간">
          <Bars buckets={results.tenures} />
        </Card>
      </div>
    </section>
  );
}
