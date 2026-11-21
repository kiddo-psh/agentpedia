import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { MetricSwitcher } from "@/components/models/MetricSwitcher";
import { buildLeaderboard } from "@/components/models/metrics";
import { listModels, loadTaskTiming, rankModelsByTerminalBench } from "@/content/models";
import "./models.css";

export const metadata: Metadata = {
  title: "모델 비교",
  description: "코딩 에이전트에 쓰는 모델의 벤치마크, 토큰 단가, 작업당 시간을 출처와 함께 비교합니다.",
};

export default async function ModelsPage() {
  return <ModelsIndex />;
}

async function ModelsIndex() {
  "use cache";
  cacheLife("days");
  const models = rankModelsByTerminalBench(listModels());
  const timing = loadTaskTiming();
  const payload = buildLeaderboard(models, timing);

  return (
    <div className="models-page mx-auto max-w-[760px] pt-2">
      <header className="models-hero">
        <p className="text-[13px] font-medium text-muted">도구</p>
        <h1 className="mt-2 text-4xl font-medium tracking-[-0.03em]">모델 비교</h1>
        <p className="mt-4 max-w-[40em] text-lg leading-relaxed text-muted">
          Terminal-Bench 해결률을 기본으로, 런 비용·토큰·단가·작업당 시간을 같은 순위에서 바꿉니다. 확인하지
          못한 칸은 비워 둡니다.
        </p>
      </header>

      <section className="mt-10" aria-labelledby="leaderboard-title">
        <h2 id="leaderboard-title" className="sr-only">
          모델 리더보드
        </h2>
        <MetricSwitcher payload={payload} />
      </section>

      <section className="mt-16" aria-labelledby="model-list">
        <h2 id="model-list" className="text-[22px] font-semibold tracking-tight">
          모델 목록
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">각 모델의 벤치마크·단가·토론으로 이어집니다.</p>
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
