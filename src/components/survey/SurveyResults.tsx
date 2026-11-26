import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { SurveyLive } from "@/components/survey/SurveyLive";
import { aggregateSurvey } from "@/survey/aggregate";
import { modelOptions, surveyCatalog } from "@/survey/options";
import { loadSurveyResults } from "@/survey/service";
import { getDb } from "@/db/client";

function emptyBoard() {
  const models = modelOptions();
  return <SurveyLive initial={aggregateSurvey([], surveyCatalog(models))} models={models} />;
}

/** Same bars and form as the loaded board, at zero, so streamed counts do not change the page height. */
export function SurveyResultsFallback() {
  return emptyBoard();
}

export async function SurveyResults() {
  await connection();
  const models = modelOptions();
  let failed = false;
  let results = aggregateSurvey([], surveyCatalog(models));
  try {
    results = await loadSurveyResults(await getDb(), surveyCatalog(models));
  } catch (err) {
    unstable_rethrow(err);
    console.error("[survey] failed to load results", err);
    failed = true;
  }
  if (failed) {
    return (
      <section className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight">응답</h2>
        <p className="mt-2 text-sm text-muted">지금은 응답을 불러올 수 없습니다.</p>
      </section>
    );
  }
  return <SurveyLive initial={results} models={models} />;
}
