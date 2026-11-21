import { describe, expect, it } from "vitest";
import { LIMIT, type Hit } from "@/ratelimit";
import { reviewRateLimitError } from "./guard";

describe("reviewRateLimitError", () => {
  it("uses the shared per-IP window and stays open without a store", async () => {
    const counts = new Map<string, number>();
    const hit: Hit = async (key) => {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    };
    const headers = new Headers({ "x-forwarded-for": "9.9.9.9" });
    for (let i = 0; i < LIMIT; i++) expect(await reviewRateLimitError(headers, hit)).toBeNull();
    expect(await reviewRateLimitError(headers, hit)).toMatch(/너무 많습니다/);
    expect(await reviewRateLimitError(headers, null)).toBeNull();
  });
});
