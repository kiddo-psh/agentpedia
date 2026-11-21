import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { BarChart } from "@/components/models/BarChart";
import { formatDate } from "@/content/labels";
import { listModels, loadTaskTiming } from "@/content/models";
import { SourceAge } from "@/components/SourceAge";

export const metadata: Metadata = {
  title: "모델 비교",
  description: "코딩 에이전트에 쓰는 모델의 벤치마크, 토큰 단가, 작업당 시간을 출처와 함께 비교합니다.",
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatDuration(sec: number): string {
  const minutes = Math.floor(sec / 60);
  const seconds = Math.round(sec % 60);
  return `${minutes}분 ${String(seconds).padStart(2, "0")}초`;
}

export default async function ModelsPage() {
  return <ModelsIndex />;
}

async function ModelsIndex() {
  "use cache";
  cacheLife("days");
  const models = listModels();
  const timing = loadTaskTiming();

  const terminal = models
    .map((model) => {
      const row = model.benchmarks.find((bench) => bench.bench === "Terminal-Bench" && bench.version === "4.1");
      return row ? { model, row } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => b.row.score - a.row.score);

  const asOf = terminal[0]?.row.asOf;

  return (
    <div className="mx-auto max-w-[720px] pt-2">
      <p className="text-[13px] font-medium text-muted">도구</p>
      <h1 className="mt-2 text-4xl font-medium tracking-[-0.03em]">모델 비교</h1>
      <p className="mt-4 max-w-[40em] text-lg leading-relaxed text-muted">
        Claude, GPT, Gemini, Grok 계열의 공개 리더보드와 토큰 단가를 모았습니다. 확인하지 못한 칸은 비워 둡니다.
      </p>
      {asOf ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <span>Terminal-Bench 기준일 {formatDate(asOf)}</span>
          <SourceAge newestIso={asOf.toISOString()} />
        </p>
      ) : null}

      <section className="mt-12" aria-labelledby="tb-score">
        <h2 id="tb-score" className="text-[22px] font-semibold tracking-tight">
          Terminal-Bench 4.1 해결률
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          행마다 에이전트 하네스가 다릅니다. 모델만 비교한 값이 아니라, 그 제품으로 잰 값입니다.
        </p>
        <div className="mt-6">
          <BarChart
            title="해결률"
            unit="%"
            data={terminal.map(({ model, row }) => ({
              id: model.slug,
              label: model.name,
              value: row.score,
              detail: row.agentHarness,
            }))}
            format={(value) => `${value}%`}
          />
        </div>
      </section>

      <section className="mt-14" aria-labelledby="tb-cost">
        <h2 id="tb-cost" className="text-[22px] font-semibold tracking-tight">
          Terminal-Bench 4.1 비용 · 토큰
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">리더보드가 찍은 전체 런 비용과 토큰량입니다.</p>
        <div className="mt-6 grid gap-10">
          <BarChart
            title="비용"
            unit="USD"
            data={terminal
              .filter(({ row }) => row.costUsd !== undefined)
              .map(({ model, row }) => ({
                id: model.slug,
                label: model.name,
                value: row.costUsd!,
              }))}
            format={(value) => money.format(value)}
          />
          <BarChart
            title="토큰"
            unit="십억(B)"
            data={terminal
              .filter(({ row }) => row.tokensBillions !== undefined)
              .map(({ model, row }) => ({
                id: model.slug,
                label: model.name,
                value: row.tokensBillions!,
              }))}
            format={(value) => `${value}B`}
          />
        </div>
      </section>

      <section className="mt-14" aria-labelledby="token-price">
        <h2 id="token-price" className="text-[22px] font-semibold tracking-tight">
          토큰 당 비용
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          OpenRouter 목록 가격입니다. 백만 토큰당 USD이고, 캐시·할인은 반영하지 않았습니다.
        </p>
        <div className="mt-6 grid gap-10">
          <BarChart
            title="입력"
            unit="USD / 1M tokens"
            data={models
              .filter((model) => model.inputUsdPerMTok)
              .map((model) => ({
                id: model.slug,
                label: model.name,
                value: model.inputUsdPerMTok!.value,
              }))}
            format={(value) => money.format(value)}
          />
          <BarChart
            title="출력"
            unit="USD / 1M tokens"
            data={models
              .filter((model) => model.outputUsdPerMTok)
              .map((model) => ({
                id: model.slug,
                label: model.name,
                value: model.outputUsdPerMTok!.value,
              }))}
            format={(value) => money.format(value)}
          />
        </div>
      </section>

      <section className="mt-14" aria-labelledby="task-time">
        <h2 id="task-time" className="text-[22px] font-semibold tracking-tight">
          작업 당 시간 · 비용
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Vals AI SWE-bench Verified, Mini-SWE-agent 고정 하네스입니다. 보드가 2026-09-01에 갱신을 멈춰서 위
          Terminal-Bench 모델과 버전이 다릅니다.
        </p>
        <div className="mt-6 grid gap-10">
          <BarChart
            title="작업당 시간"
            unit="초"
            data={timing.map((row) => ({
              id: row.model,
              label: row.model,
              value: row.durationSec,
              detail: row.vendor,
            }))}
            format={formatDuration}
          />
          <BarChart
            title="작업당 비용"
            unit="USD / test"
            data={timing.map((row) => ({
              id: row.model,
              label: row.model,
              value: row.costUsd,
              detail: `${row.score}%`,
            }))}
            format={(value) => money.format(value)}
          />
        </div>
        <p className="mt-4 text-sm text-muted">
          출처{" "}
          <a href="https://www.vals.ai/benchmarks/swebench" className="underline underline-offset-2" target="_blank" rel="noreferrer">
            vals.ai/benchmarks/swebench
          </a>
          · 기준일 2026-09-01
        </p>
      </section>

      <section className="mt-16" aria-labelledby="model-list">
        <h2 id="model-list" className="text-[22px] font-semibold tracking-tight">
          모델
        </h2>
        <ul className="mt-6 border-b border-line">
          {models.map((model) => (
            <li key={model.slug} className="border-t border-line">
              <Link
                href={`/models/${model.slug}`}
                prefetch={true}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4 hover:text-foreground"
              >
                <span>
                  <span className="text-lg font-medium">{model.name}</span>
                  <span className="mt-1 block text-sm text-muted">{model.vendor}</span>
                </span>
                <span className="text-sm text-muted">리뷰 · 토론</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
