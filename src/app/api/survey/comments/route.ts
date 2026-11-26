import { getDb } from "@/db/client";
import { visitorId } from "@/events/record";
import { createSurveyComment } from "@/survey/comments";
import { rejectsCrossSite, surveyJson, surveyRedirect } from "@/survey/http";

async function readComment(request: Request) {
  const json = (request.headers.get("content-type") ?? "").includes("application/json");
  if (json) {
    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    return {
      json,
      nickname: typeof raw?.nickname === "string" ? raw.nickname : "",
      body: typeof raw?.body === "string" ? raw.body : "",
      parentId: typeof raw?.parentId === "string" ? raw.parentId : "",
      company:
        typeof raw?.survey_hp === "string" ? raw.survey_hp : typeof raw?.company === "string" ? raw.company : "",
    };
  }
  const form = await request.formData();
  return {
    json,
    nickname: String(form.get("nickname") ?? ""),
    body: String(form.get("body") ?? ""),
    parentId: String(form.get("parentId") ?? ""),
    company: String(form.get("survey_hp") ?? ""),
  };
}

export async function POST(request: Request) {
  if (rejectsCrossSite(request)) return new Response(null, { status: 403 });
  const visitor = visitorId(request);
  const { json, nickname, body, company, parentId } = await readComment(request);
  try {
    const result = await createSurveyComment(await getDb(), {
      visitorId: visitor.id,
      nickname,
      body,
      company,
      parentId,
    });
    if (!result.ok) {
      return json
        ? surveyJson(request, { ok: false, error: result.error }, result.code === "rate" ? 429 : 400, visitor, false)
        : surveyRedirect(request, `comment=${result.code}`, visitor, false, "comments");
    }
    return json
      ? surveyJson(request, { ok: true }, 201, visitor, false)
      : surveyRedirect(request, "comment=ok", visitor, false, "comments");
  } catch (err) {
    console.error("[survey] comment failed", err);
    return json
      ? surveyJson(request, { ok: false, error: "저장하지 못했습니다." }, 500, visitor, false)
      : surveyRedirect(request, "comment=invalid", visitor, false, "comments");
  }
}
