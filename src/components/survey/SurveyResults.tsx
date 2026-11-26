import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { getDb } from "@/db/client";
import { aggregateSurvey, type Bucket, type SurveyResults as SurveyResultsData } from "@/survey/aggregate";
import { agentAppOptions, modelOptions, TENURE_OPTIONS, USE_OPTIONS, withOther } from "@/survey/options";
import { listSurveyAnswers } from "@/survey/service";

export function SurveyResultsFallback() {
  return (
    <section className="mt-14" aria-busy="true" aria-labelledby="survey-results-title">
      <h2 id="survey-results-title" className="text-xl font-semibold tracking-tight">
        응답
      </h2>
      <p className="mt-2 text-sm text-muted">응답을 불러오는 중…</p>
      <p className="mt-1 min-h-5 text-sm text-muted" />
    </section>
  );
}

function Bars({ buckets, multi }: { buckets: Bucket[]; multi: boolean }) {
  return (
    <div className="mt-4">
      {multi && <p className="text-xs text-muted">복수 응답이라 비율의 합이 100을 넘을 수 있습니다.</p>}
      <ul className="mt-3 grid gap-3">
        {buckets.map((bucket) => (
          <li key={bucket.id}>
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
        ))}
      </ul>
    </div>
  );
}

function ResultsView({ results }: { results: SurveyResultsData }) {
  return (
    <section className="mt-14" aria-labelledby="survey-results-title">
      <h2 id="survey-results-title" className="text-xl font-semibold tracking-tight">
        응답
      </h2>
      <p className="mt-2 text-sm tabular-nums">{results.n}명 응답</p>
      {results.published ? (
        <div className="mt-6 grid gap-8">
          <p className="text-sm text-muted">기타로 적은 문장은 공개하지 않고, 기타 한 묶음으로만 셉니다.</p>
          <div>
            <h3 className="text-base font-semibold">주로 쓰는 에이전트 앱</h3>
            <Bars buckets={results.agents} multi />
          </div>
          <div>
            <h3 className="text-base font-semibold">선호 모델</h3>
            <Bars buckets={results.models} multi={false} />
          </div>
          <div>
            <h3 className="text-base font-semibold">주 용도</h3>
            <Bars buckets={results.uses} multi />
          </div>
          <div>
            <h3 className="text-base font-semibold">에이전트 사용 기간</h3>
            <Bars buckets={results.tenures} multi={false} />
          </div>
        </div>
      ) : (
        <p className="mt-1 text-sm text-muted tabular-nums">
          {results.n}/{results.threshold}명 모이면 공개
        </p>
      )}
    </section>
  );
}

export async function SurveyResults() {
  await connection();
  let results: SurveyResultsData | null = null;
  try {
    const rows = await listSurveyAnswers(await getDb());
    results = aggregateSurvey(rows, {
      agents: withOther(agentAppOptions()),
      models: withOther(modelOptions()),
      uses: withOther(USE_OPTIONS),
      tenures: TENURE_OPTIONS,
    });
  } catch (err) {
    unstable_rethrow(err);
    console.error("[survey] failed to load results", err);
  }
  if (!results) {
    return (
      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight">응답</h2>
        <p className="mt-2 text-sm text-muted">지금은 응답을 불러올 수 없습니다.</p>
      </section>
    );
  }
  return <ResultsView results={results} />;
}
