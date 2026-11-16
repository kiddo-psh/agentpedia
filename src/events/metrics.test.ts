import { describe, expect, it } from "vitest";
import { events } from "@/db/schema";
import { createTestDb } from "@/db/testing";
import { articleMetrics, returnRate } from "./metrics";

describe("articleMetrics", () => {
  it("computes distinct viewers, appliers, rate and MCP usage per article", async () => {
    const db = await createTestDb();
    await db.insert(events).values([
      { kind: "view", articleSlug: "a", visitorHash: "v1" },
      { kind: "view", articleSlug: "a", visitorHash: "v1" },
      { kind: "view", articleSlug: "a", visitorHash: "v2" },
      { kind: "web_copy", articleSlug: "a", visitorHash: "v1" },
      { kind: "kit_download", articleSlug: "a", visitorHash: "v1" },
      { kind: "mcp_prompt", articleSlug: "a", visitorHash: "m1" },
      { kind: "mcp_get_kit", articleSlug: "a", visitorHash: "m1" },
      { kind: "mcp_get_article", articleSlug: "b", visitorHash: "m2" },
      { kind: "view", articleSlug: "old", visitorHash: "v9", createdAt: new Date("2020-01-01") },
    ]);

    const m = await articleMetrics(db, new Date("2026-01-01"));
    expect(m).toEqual([
      { articleSlug: "a", viewers: 2, webAppliers: 1, applyRate: 0.5, mcpCalls: 2, mcpClients: 1 },
      { articleSlug: "b", viewers: 0, webAppliers: 0, applyRate: null, mcpCalls: 1, mcpClients: 1 },
    ]);
  });
});

describe("returnRate", () => {
  const at = (iso: string) => new Date(iso);
  const visit = (visitorId: string, iso: string) => ({ kind: "view" as const, articleSlug: "a", visitorId, createdAt: at(iso) });
  const A = "00000000-0000-4000-8000-00000000000a";
  const B = "00000000-0000-4000-8000-00000000000b";
  const C = "00000000-0000-4000-8000-00000000000c";
  const D = "00000000-0000-4000-8000-00000000000d";
  const E = "00000000-0000-4000-8000-00000000000e";

  it("counts cohort browsers that came back on another day within four weeks", async () => {
    const db = await createTestDb();
    await db.insert(events).values([
      // A returns 10 days later.
      visit(A, "2026-10-01T03:00:00Z"),
      visit(A, "2026-10-11T03:00:00Z"),
      // B visits twice on the same Seoul day (23:00 and 00:30 UTC are 08:00 and 09:30 KST).
      visit(B, "2026-10-01T23:00:00Z"),
      visit(B, "2026-10-02T00:30:00Z"),
      // C comes back only after the 28-day window.
      visit(C, "2026-10-02T03:00:00Z"),
      visit(C, "2026-10-31T03:00:00Z"),
      // D was first seen before the cohort, E after it: neither belongs to it.
      visit(D, "2026-09-20T03:00:00Z"),
      visit(D, "2026-10-03T03:00:00Z"),
      visit(E, "2026-10-08T03:00:00Z"),
      visit(E, "2026-10-09T03:00:00Z"),
      // Events without a visitor ID (MCP, or before the cookie existed) are ignored.
      { kind: "mcp_prompt", articleSlug: "a", visitorHash: "m1", createdAt: at("2026-10-01T03:00:00Z") },
    ]);

    expect(await returnRate(db, at("2026-10-01T00:00:00Z"), at("2026-10-08T00:00:00Z"))).toEqual({
      cohortFrom: at("2026-10-01T00:00:00Z"),
      cohortTo: at("2026-10-08T00:00:00Z"),
      visitors: 3,
      returning: 1,
      rate: 1 / 3,
    });
  });

  it("returns a null rate for an empty cohort", async () => {
    const db = await createTestDb();
    expect(await returnRate(db, at("2026-10-01T00:00:00Z"), at("2026-10-08T00:00:00Z"))).toMatchObject({
      visitors: 0,
      returning: 0,
      rate: null,
    });
  });
});
