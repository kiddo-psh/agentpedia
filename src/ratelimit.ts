/** Requests each client IP may make per window on the rate-limited paths. */
export const LIMIT = 60;
export const WINDOW_SECONDS = 60;

/**
 * Increments the counter at `key` and returns its new value. The counter must expire after
 * `ttlSeconds`. It has to live outside the process: Vercel runs many function instances.
 */
export type Hit = (key: string, ttlSeconds: number) => Promise<number>;

/** The client IP that Vercel's edge sets. Vercel overwrites these headers, so clients cannot spoof them. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Fixed window: one counter per IP per minute. Returns a 429 response when the request is over
 * the limit, or null to let it through. Fails open when the store is unreachable.
 */
export async function rateLimit(request: Request, hit: Hit, now = Date.now()): Promise<Response | null> {
  const window = Math.floor(now / 1000 / WINDOW_SECONDS);
  let count: number;
  try {
    count = await hit(`rl:${clientIp(request.headers)}:${window}`, WINDOW_SECONDS);
  } catch (error) {
    console.error("rate limit store failed; allowing request", error);
    return null;
  }
  if (count <= LIMIT) return null;

  const retryAfter = Math.ceil((window + 1) * WINDOW_SECONDS - now / 1000);
  return Response.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

/** Counter in Upstash Redis over its REST API, which works from any runtime without a TCP client. */
export function upstashHit(url: string, token: string): Hit {
  return async (key, ttlSeconds) => {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(ttlSeconds), "NX"],
      ]),
      signal: AbortSignal.timeout(1000),
    });
    if (!response.ok) throw new Error(`Upstash responded ${response.status}`);
    const [incr] = (await response.json()) as { result?: number; error?: string }[];
    if (typeof incr?.result !== "number") throw new Error(`Upstash INCR failed: ${incr?.error}`);
    return incr.result;
  };
}

/**
 * The store from the environment. The Upstash integration in the Vercel Marketplace sets the
 * KV_* names; a database created on upstash.com uses the UPSTASH_* names. Unset -> no limit,
 * so local dev and tests need no setup.
 */
export function hitFromEnv(env: NodeJS.ProcessEnv = process.env): Hit | null {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  return url && token ? upstashHit(url, token) : null;
}
