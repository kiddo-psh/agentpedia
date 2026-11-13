import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "./proxy";
import { clientIp, LIMIT, rateLimit, upstashHit, type Hit } from "./ratelimit";

/** Same contract as the Redis store, kept in memory. */
function memoryHit(): Hit {
  const counts = new Map<string, number>();
  return async (key) => {
    const next = (counts.get(key) ?? 0) + 1;
    counts.set(key, next);
    return next;
  };
}

const request = (ip: string) =>
  new Request("https://agentpedia.test/mcp", { method: "POST", headers: { "x-forwarded-for": `${ip}, 10.0.0.1` } });

// 12:00:15 UTC, 45 seconds before the window resets.
const now = Date.UTC(2026, 10, 13, 12, 0, 15);

describe("rateLimit", () => {
  it("lets 60 requests through and answers the 61st with 429 and Retry-After", async () => {
    const hit = memoryHit();
    for (let i = 0; i < LIMIT; i++) expect(await rateLimit(request("1.1.1.1"), hit, now)).toBeNull();

    const limited = await rateLimit(request("1.1.1.1"), hit, now);
    expect(limited?.status).toBe(429);
    expect(limited?.headers.get("Retry-After")).toBe("45");
  });

  it("counts each IP separately", async () => {
    const hit = memoryHit();
    for (let i = 0; i <= LIMIT; i++) await rateLimit(request("1.1.1.1"), hit, now);
    expect(await rateLimit(request("2.2.2.2"), hit, now)).toBeNull();
  });

  it("starts a fresh count in the next window", async () => {
    const hit = memoryHit();
    for (let i = 0; i <= LIMIT; i++) await rateLimit(request("1.1.1.1"), hit, now);
    expect(await rateLimit(request("1.1.1.1"), hit, now + 45_000)).toBeNull();
  });

  it("lets requests through when the store fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await rateLimit(request("1.1.1.1"), () => Promise.reject(new Error("down")), now)).toBeNull();
  });
});

describe("clientIp", () => {
  it("takes the first x-forwarded-for value, then x-real-ip", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": " 1.1.1.1 , 10.0.0.1" }))).toBe("1.1.1.1");
    expect(clientIp(new Headers({ "x-real-ip": "2.2.2.2" }))).toBe("2.2.2.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("upstashHit", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("increments and sets the expiry in one pipeline call", async () => {
    const fetch = vi.fn(async () => Response.json([{ result: 3 }, { result: 0 }]));
    vi.stubGlobal("fetch", fetch);

    expect(await upstashHit("https://redis.test", "token")("rl:1.1.1.1:1", 60)).toBe(3);
    expect(fetch).toHaveBeenCalledWith(
      "https://redis.test/pipeline",
      expect.objectContaining({
        headers: { Authorization: "Bearer token" },
        body: JSON.stringify([["INCR", "rl:1.1.1.1:1"], ["EXPIRE", "rl:1.1.1.1:1", "60", "NX"]]),
      }),
    );
  });
});

describe("proxy", () => {
  it.each(["/mcp", "/api/events"])("runs on %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
  });

  it.each(["/", "/a/some-article", "/api/auth/callback/github", "/api/metrics", "/mcp-guide"])(
    "skips %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
    },
  );

  it("lets everything through when no store is configured", async () => {
    const response = await proxy(new NextRequest("https://agentpedia.test/mcp", { method: "POST" }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
