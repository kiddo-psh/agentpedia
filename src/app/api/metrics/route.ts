import { connection } from "next/server";
import { getDb } from "@/db/client";
import { articleMetrics, RETURN_WINDOW_DAYS, returnRate } from "@/events/metrics";

/**
 * Apply-rate and return-rate metrics as JSON. The return-rate cohort is the `days` before the
 * last 28, so every visitor in it had the full four weeks to come back. Requires `Authorization: Bearer $METRICS_TOKEN` when the
 * token is set; without a token it is available only in development.
 */
export async function GET(request: Request) {
  // Live numbers: never prerender this at build time.
  await connection();
  const token = process.env.METRICS_TOKEN;
  const allowed = token
    ? request.headers.get("authorization") === `Bearer ${token}`
    : process.env.NODE_ENV !== "production";
  if (!allowed) return new Response(null, { status: 404 });

  const days = Math.min(Math.max(Number(new URL(request.url).searchParams.get("days")) || 7, 1), 365);
  const now = Date.now();
  const since = new Date(now - days * 86_400_000);
  const cohortTo = new Date(now - RETURN_WINDOW_DAYS * 86_400_000);
  const cohortFrom = new Date(cohortTo.getTime() - days * 86_400_000);
  const db = await getDb();
  return Response.json({
    days,
    since,
    articles: await articleMetrics(db, since),
    returnRate: await returnRate(db, cohortFrom, cohortTo),
  });
}
