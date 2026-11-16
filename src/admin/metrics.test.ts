import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { account } from "@/db/schema";
import { createTestDb, insertUser } from "@/db/testing";
import { isMetricsAdmin, parseAdminIds, parsePeriod, returnCohort, totalMetrics } from "./metrics";

describe("returnCohort", () => {
  it("ends 28 days ago and spans the chosen period before that", () => {
    const now = Date.UTC(2026, 10, 16);
    expect(returnCohort(7, now)).toEqual({
      from: new Date(Date.UTC(2026, 9, 12)),
      to: new Date(Date.UTC(2026, 9, 19)),
    });
  });
});

describe("parsePeriod", () => {
  it("accepts only the listed periods and defaults to 7", () => {
    expect(parsePeriod("28")).toBe(28);
    expect(parsePeriod(["90", "7"])).toBe(90);
    expect(parsePeriod("30")).toBe(7);
    expect(parsePeriod("abc")).toBe(7);
    expect(parsePeriod(undefined)).toBe(7);
  });
});

describe("parseAdminIds", () => {
  it("splits on commas and drops blanks", () => {
    expect(parseAdminIds(" 123, 456 ,,")).toEqual(["123", "456"]);
    expect(parseAdminIds(undefined)).toEqual([]);
  });
});

describe("isMetricsAdmin", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
    await insertUser(db, "admin");
    await insertUser(db, "other");
    await insertUser(db, "pw");
    await db.insert(account).values([
      { id: "a1", userId: "admin", providerId: "github", accountId: "111", updatedAt: new Date() },
      { id: "a2", userId: "other", providerId: "github", accountId: "222", updatedAt: new Date() },
      // A password account whose id happens to equal an admin id must not count.
      { id: "a3", userId: "pw", providerId: "credential", accountId: "111", updatedAt: new Date() },
    ]);
  });

  it("allows only users linked to a listed GitHub account", async () => {
    expect(await isMetricsAdmin(db, "admin", ["111"])).toBe(true);
    expect(await isMetricsAdmin(db, "other", ["111"])).toBe(false);
    expect(await isMetricsAdmin(db, "pw", ["111"])).toBe(false);
    expect(await isMetricsAdmin(db, undefined, ["111"])).toBe(false);
  });

  it("without a list, is open outside production only", async () => {
    // vitest runs with NODE_ENV=test.
    expect(await isMetricsAdmin(db, undefined, [])).toBe(true);
  });
});

describe("totalMetrics", () => {
  it("sums articles and derives the overall apply rate", () => {
    const row = { viewers: 0, webAppliers: 0, applyRate: null, mcpCalls: 0, mcpClients: 0 };
    expect(
      totalMetrics([
        { ...row, articleSlug: "a", viewers: 3, webAppliers: 1, mcpCalls: 4, mcpClients: 2 },
        { ...row, articleSlug: "b", viewers: 1, webAppliers: 1, mcpCalls: 1, mcpClients: 1 },
      ]),
    ).toEqual({ viewers: 4, webAppliers: 2, applyRate: 0.5, mcpCalls: 5, mcpClients: 3 });
    expect(totalMetrics([]).applyRate).toBeNull();
  });
});
