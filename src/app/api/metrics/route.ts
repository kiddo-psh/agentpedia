import { connection } from "next/server";
import { getDb } from "@/db/client";
import { articleMetrics } from "@/events/metrics";

/**
 * Apply-rate metrics as JSON. Requires `Authorization: Bearer $METRICS_TOKEN` when the
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
  const since = new Date(Date.now() - days * 86_400_000);
  return Response.json({ days, since, articles: await articleMetrics(await getDb(), since) });
}
