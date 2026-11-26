import type { Db } from "@/db/client";
import { surveyResponses } from "@/db/schema";
import { aggregateSurvey, type SurveyCatalog, type SurveyResults } from "./aggregate";
import { decodeModelIds, encodeModelIds } from "./codec";
import type { SurveyAnswer } from "./validate";

export type SaveSurveyInput = SurveyAnswer & {
  visitorId: string;
  userId?: string | null;
};

/** Inserts one row per visitor cookie. A repeat submit reports `already` and does not change the row. */
export async function saveSurveyResponse(
  db: Db,
  input: SaveSurveyInput,
): Promise<{ ok: true; already: boolean }> {
  const inserted = await db
    .insert(surveyResponses)
    .values({
      visitorId: input.visitorId,
      userId: input.userId ?? null,
      agents: input.agents,
      agentOther: input.agentOther,
      model: encodeModelIds(input.models),
      modelOther: input.modelOther,
      uses: input.uses,
      useOther: input.useOther,
      tenure: input.tenure,
    })
    .onConflictDoNothing({ target: surveyResponses.visitorId })
    .returning({ id: surveyResponses.id });
  return { ok: true, already: inserted.length === 0 };
}

export async function listSurveyAnswers(db: Db): Promise<SurveyAnswer[]> {
  const rows = await db
    .select({
      agents: surveyResponses.agents,
      agentOther: surveyResponses.agentOther,
      model: surveyResponses.model,
      modelOther: surveyResponses.modelOther,
      uses: surveyResponses.uses,
      useOther: surveyResponses.useOther,
      tenure: surveyResponses.tenure,
    })
    .from(surveyResponses);
  return rows.map((row) => ({
    agents: row.agents,
    agentOther: row.agentOther,
    models: decodeModelIds(row.model),
    modelOther: row.modelOther,
    uses: row.uses,
    useOther: row.useOther,
    tenure: row.tenure,
  }));
}

export async function loadSurveyResults(db: Db, catalog: SurveyCatalog): Promise<SurveyResults> {
  return aggregateSurvey(await listSurveyAnswers(db), catalog);
}
