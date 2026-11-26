import { getDb } from "@/db/client";
import { visitorId } from "@/events/record";
import { reportSurveyComment } from "@/survey/comments";
import { rejectsCrossSite, surveyJson, surveyRedirect } from "@/survey/http";

export async function POST(request: Request) {
  if (rejectsCrossSite(request)) return new Response(null, { status: 403 });
  const visitor = visitorId(request);
  const json = (request.headers.get("content-type") ?? "").includes("application/json");
  let id = "";
  let company = "";
  if (json) {
    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    id = typeof raw?.id === "string" ? raw.id : "";
    company =
      typeof raw?.survey_hp === "string" ? raw.survey_hp : typeof raw?.company === "string" ? raw.company : "";
  } else {
    const form = await request.formData();
    id = String(form.get("id") ?? "");
    company = String(form.get("survey_hp") ?? "");
  }

  try {
    const result = await reportSurveyComment(await getDb(), { commentId: id, visitorId: visitor.id, company });
    if (!result.ok) {
      const code = result.code === "rate" ? "rate" : "invalid";
      return json
        ? surveyJson(request, { ok: false, error: result.error }, result.code === "rate" ? 429 : 400, visitor, false)
        : surveyRedirect(request, `comment=${code}`, visitor, false, "comments");
    }
    return json
      ? surveyJson(request, { ok: true, hidden: result.hidden }, 200, visitor, false)
      : surveyRedirect(request, "comment=reported", visitor, false, "comments");
  } catch (err) {
    console.error("[survey] report failed", err);
    return json
      ? surveyJson(request, { ok: false, error: "신고하지 못했습니다." }, 500, visitor, false)
      : surveyRedirect(request, "comment=invalid", visitor, false, "comments");
  }
}
