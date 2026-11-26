import { canViewMetrics } from "@/admin/metrics";
import { getDb } from "@/db/client";
import { visitorId } from "@/events/record";
import { moderateSurveyComment } from "@/survey/comments";
import { rejectsCrossSite, surveyRedirect } from "@/survey/http";

/** Metrics admins only. Everyone else gets the same 404 as /admin/metrics. */
export async function POST(request: Request) {
  if (rejectsCrossSite(request)) return new Response(null, { status: 403 });
  const visitor = visitorId(request);
  const allowed = await canViewMetrics(request.headers).catch(() => false);
  if (!allowed) return new Response(null, { status: 404 });

  const form = await request.formData();
  const op = String(form.get("op") ?? "");
  if (op !== "hide" && op !== "delete") return new Response(null, { status: 400 });

  try {
    await moderateSurveyComment(await getDb(), { id: String(form.get("id") ?? ""), op, isAdmin: true });
  } catch (err) {
    console.error("[survey] moderate failed", err);
  }
  return surveyRedirect(request, "", visitor, false, "comments");
}
