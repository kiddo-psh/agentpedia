import { hitFromEnv, rateLimit, type Hit } from "@/ratelimit";

export const REVIEW_RATE_LIMIT_ERROR = "요청이 너무 많습니다. 잠시 후 다시 시도하세요.";

/** The same Upstash window as /mcp and /api/events. No store means no limit. */
export async function reviewRateLimitError(requestHeaders: Headers, hit: Hit | null): Promise<string | null> {
  if (!hit) return null;
  const blocked = await rateLimit(
    new Request("https://agentpedia.local/agents/review", { headers: requestHeaders }),
    hit,
  );
  return blocked ? REVIEW_RATE_LIMIT_ERROR : null;
}

export function reviewHit(): Hit | null {
  return hitFromEnv();
}
