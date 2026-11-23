import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { ModelsTable } from "@/components/models/ModelsTable";
import { ModelsTableDesktopBody, ModelsTableMobileList } from "@/components/models/ModelsTableView";
import { ScoreCostScatter } from "@/components/models/ScoreCostScatter";
import { WhichModelCards } from "@/components/models/WhichModelCards";
import { buildModelsTable, buildScatterPoints, compareRows, pickWhichModels } from "@/components/models/metrics";
import { listModels, rankModelsByTerminalBench } from "@/content/models";
import { MODELS_HERO_LEDE, MODELS_HERO_TITLE } from "@/fonts/lcpCopy";
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
  const defaultRows = [...table.rows].sort((a, b) => compareRows(a, b, "rank", "asc"));
  const scatter = buildScatterPoints(table.rows);
  const picks = pickWhichModels(scatter);

  return (
    <div className="models-page mx-auto max-w-[1100px] pt-2">
      <header className="models-hero">
        <h1 className="mt-2 text-4xl font-medium tracking-[-0.03em]">{MODELS_HERO_TITLE}</h1>
        <p className="mt-4 max-w-[42em] text-lg leading-relaxed text-muted">{MODELS_HERO_LEDE}</p>
      </header>

      <section className="mt-10" aria-labelledby="scatter-title">
        <h2 id="scatter-title" className="text-[22px] font-semibold tracking-tight">
          해결률과 실행 비용
        </h2>
        <p className="mt-2 text-sm text-muted">
          가성비 경계선 위의 모델보다 더 싸면서 더 많이 푼 모델은 없습니다.
        </p>
        <div className="mt-5">
          <ScoreCostScatter points={scatter} />
        </div>
      </section>

      <WhichModelCards picks={picks} />

      <section className="mt-14" aria-labelledby="table-title">
        <h2 id="table-title" className="text-[22px] font-semibold tracking-tight">
          비교 표
        </h2>
        <p className="mt-2 text-sm text-muted">모델을 누르면 상세 정보와 토론으로 이동합니다.</p>
        <div className="mt-5">
          <ModelsTable
            payload={table}
            desktopBody={<ModelsTableDesktopBody rows={defaultRows} />}
            mobileList={<ModelsTableMobileList rows={defaultRows} />}
          />
        </div>
      </section>
    </div>
  );
}
