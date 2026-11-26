import { getDb } from "@/db/client";
import { visitorId } from "@/events/record";
import { getSession } from "@/lib/auth";
import { agentAppOptions, modelOptions, TENURE_OPTIONS, USE_OPTIONS } from "@/survey/options";
import { saveSurveyResponse } from "@/survey/service";
import { rejectsCrossSite, surveyJson, surveyRedirect } from "@/survey/http";
import { fieldsFromForm, fieldsFromJson, honeypotFilled, parseSurveyFields } from "@/survey/validate";

async function readFields(request: Request) {
  const json = (request.headers.get("content-type") ?? "").includes("application/json");
  if (json) {
    const body = await request.json().catch(() => null);
    return { json, fields: fieldsFromJson(body) };
  }
  return { json, fields: fieldsFromForm(await request.formData()) };
}

/** One anonymous response per visitor cookie. Form posts redirect; JSON posts return the result. */
export async function POST(request: Request) {
  if (rejectsCrossSite(request)) return new Response(null, { status: 403 });
  const visitor = visitorId(request);
  const { json, fields } = await readFields(request);
  if (!fields) {
    return json
      ? surveyJson(request, { ok: false, error: "답을 확인해 주세요." }, 400, visitor, false)
      : surveyRedirect(request, "survey=invalid", visitor, false);
  }
  if (honeypotFilled(fields.company)) {
    return json
      ? surveyJson(request, { ok: true, already: false }, 200, visitor, false)
      : surveyRedirect(request, "thanks=1", visitor, false);
  }

  const parsed = parseSurveyFields(fields, agentAppOptions(), modelOptions(), USE_OPTIONS, TENURE_OPTIONS);
  if (!parsed.ok) {
    return json
      ? surveyJson(request, { ok: false, error: parsed.error }, 400, visitor, false)
      : surveyRedirect(request, "survey=invalid", visitor, false);
  }

  let userId: string | null = null;
  try {
    userId = (await getSession(request.headers))?.user.id ?? null;
  } catch (err) {
    console.error("[survey] session lookup failed", err);
  }

  try {
    const saved = await saveSurveyResponse(await getDb(), {
      ...parsed.value,
      visitorId: visitor.id,
      userId,
    });
    if (json) {
      return surveyJson(request, { ok: true, already: saved.already }, saved.already ? 200 : 201, visitor, true);
    }
    return surveyRedirect(request, saved.already ? "survey=already" : "thanks=1", visitor, true);
  } catch (err) {
    console.error("[survey] failed to save", err);
    return json
      ? surveyJson(request, { ok: false, error: "저장하지 못했습니다." }, 500, visitor, false)
      : surveyRedirect(request, "survey=invalid", visitor, false);
  }
}
