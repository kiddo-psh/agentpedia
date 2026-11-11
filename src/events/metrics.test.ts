import { describe, expect, it } from "vitest";
import { events } from "@/db/schema";
import { createTestDb } from "@/db/testing";
import { articleMetrics } from "./metrics";

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
