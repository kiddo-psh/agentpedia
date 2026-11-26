import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { headers } from "next/headers";
import { SurveyLive } from "@/components/survey/SurveyLive";
import { getDb } from "@/db/client";
import { existingVisitorId } from "@/events/record";
import { modelOptions, surveyCatalog } from "@/survey/options";
import type { SurveyResults } from "@/survey/aggregate";
import { hasSurveyResponse, loadSurveyResults } from "@/survey/service";

/** Form only. Counts stay out of the shell so an unanswered visitor never receives them. */
export function SurveyResultsFallback() {
  return <SurveyLive answered={false} results={null} models={modelOptions()} />;
}

export async function SurveyResults() {
  await connection();
  const models = modelOptions();
  const visitor = existingVisitorId((await headers()).get("cookie"));
  let answered = false;
  let results: SurveyResults | null = null;
  let failed = false;
  try {
    if (visitor) {
      const db = await getDb();
      answered = await hasSurveyResponse(db, visitor);
      if (answered) results = await loadSurveyResults(db, surveyCatalog(models));
    }
  } catch (err) {
    unstable_rethrow(err);
    console.error("[survey] failed to load results", err);
    failed = true;
  }
  if (failed) {
    return (
      <section className="survey-slot mt-8">
        <p className="text-sm text-muted">지금은 응답을 불러올 수 없습니다.</p>
      </section>
    );
  }
  return <SurveyLive answered={answered} results={results} models={models} />;
}
