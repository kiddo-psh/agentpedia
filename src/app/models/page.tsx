import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { ModelsTable } from "@/components/models/ModelsTable";
import { ScoreCostScatter } from "@/components/models/ScoreCostScatter";
import { WhichModelCards } from "@/components/models/WhichModelCards";
import { buildModelsTable, buildScatterPoints, pickWhichModels } from "@/components/models/metrics";
import { listModels, rankModelsByTerminalBench } from "@/content/models";
import "./models.css";

export const metadata: Metadata = {
  title: "모델 비교",
  description: "코딩 에이전트에 쓰는 모델의 Terminal-Bench 벤치마크와 토큰 단가를 출처와 함께 비교합니다.",
};

export default async function ModelsPage() {
  return <ModelsIndex />;
}

async function ModelsIndex() {
  "use cache";
  cacheLife("days");
  const models = rankModelsByTerminalBench(listModels());
  const table = buildModelsTable(models);
  const scatter = buildScatterPoints(table.rows);
  const picks = pickWhichModels(scatter);

  return (
    <div className="models-page mx-auto max-w-[1100px] pt-2">
      <header className="models-hero">
        <p className="text-[13px] font-medium text-muted">도구</p>
        <h1 className="mt-2 text-4xl font-medium tracking-[-0.03em]">모델 비교</h1>
        <p className="mt-4 max-w-[42em] text-lg leading-relaxed text-muted">
          Terminal-Bench 해결률과 벤치마크 전체 런 비용으로 한눈에 보고, 표에서 단가·토큰까지 정렬합니다. 확인하지
          못한 칸은 비워 둡니다.
        </p>
      </header>

      <section className="mt-10" aria-labelledby="scatter-title">
        <h2 id="scatter-title" className="text-[22px] font-semibold tracking-tight">
          해결률 × 런 비용
        </h2>
        <p className="mt-2 text-sm text-muted">Pareto 전선은 더 싸면서 더 잘 푸는 쪽의 경계입니다.</p>
        <div className="mt-5">
          <ScoreCostScatter points={scatter} />
        </div>
      </section>

      <WhichModelCards picks={picks} />

      <section className="mt-14" aria-labelledby="table-title">
        <h2 id="table-title" className="text-[22px] font-semibold tracking-tight">
          비교 표
        </h2>
        <p className="mt-2 text-sm text-muted">행을 누르면 모델 상세·토론으로 이동합니다.</p>
        <div className="mt-5">
          <ModelsTable payload={table} />
        </div>
      </section>
    </div>
  );
}
