import type { Bucket, GroupRollup, SurveyResults } from "@/survey/aggregate";

function Bar({ bucket }: { bucket: Bucket }) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{bucket.label}</span>
        <span className="shrink-0 tabular-nums text-muted">
          {bucket.percent}% · {bucket.count}명
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
        <div className="h-full bg-foreground" style={{ width: `${bucket.percent}%` }} />
      </div>
    </li>
  );
}

function BarList({ buckets }: { buckets: readonly Bucket[] }) {
  return (
    <ul className="mt-3 grid gap-3">
      {buckets.map((bucket) => (
        <Bar key={bucket.id} bucket={bucket} />
      ))}
    </ul>
  );
}

function GroupList({ groups }: { groups: readonly GroupRollup[] }) {
  return (
    <ul className="mt-3 grid gap-3">
      {groups.map((group) => (
        <Bar key={group.id} bucket={group} />
      ))}
    </ul>
  );
}

/** CSS bars only. The track height stays put when the width changes, so the count update does not shift the page. */
export function SurveyCharts({ results }: { results: SurveyResults }) {
  return (
    <section id="survey-results" className="mt-8 scroll-mt-24" aria-labelledby="survey-results-title">
      <h2 id="survey-results-title" className="text-xl font-semibold tracking-tight">
        응답
      </h2>
      <p className="mt-2 text-sm tabular-nums">{results.n}명 응답</p>
      <div className="mt-6 grid gap-8">
        <div>
          <h3 className="text-base font-semibold">형태</h3>
          <p className="mt-1 text-xs text-muted">한 형태를 하나라도 골랐으면 그 막대에 들어갑니다. 합이 100을 넘을 수 있습니다.</p>
          <GroupList groups={results.agentGroups} />
        </div>
        {results.agentGroups.map((group) => (
          <div key={group.id}>
            <h3 className="text-base font-semibold">{group.label}</h3>
            <BarList buckets={group.options} />
          </div>
        ))}
        <div>
          <h3 className="text-base font-semibold">선호 모델</h3>
          <p className="mt-1 text-xs text-muted">여러 개를 고를 수 있어서 비율의 합이 100을 넘을 수 있습니다.</p>
          <BarList buckets={results.models} />
        </div>
        <div>
          <h3 className="text-base font-semibold">주 용도</h3>
          <p className="mt-1 text-xs text-muted">여러 개를 고를 수 있어서 비율의 합이 100을 넘을 수 있습니다.</p>
          <BarList buckets={results.uses} />
        </div>
        <div>
          <h3 className="text-base font-semibold">에이전트 사용 기간</h3>
          <BarList buckets={results.tenures} />
        </div>
      </div>
    </section>
  );
}
