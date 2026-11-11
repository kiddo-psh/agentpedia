import { describe, expect, it } from "vitest";
import { events } from "@/db/schema";
import { createTestDb } from "@/db/testing";
import { recordEvent, visitorHash } from "./record";

const h = (init: Record<string, string>) => new Headers(init);

describe("visitorHash", () => {
  const day1 = new Date("2026-11-11T10:00:00Z");
  const day2 = new Date("2026-11-12T10:00:00Z");
  const req = { "x-forwarded-for": "203.0.113.7, 10.0.0.1", "user-agent": "UA" };

  it("is stable within a day and never contains the raw IP", () => {
    const a = visitorHash(h(req), day1);
    expect(a).toBe(visitorHash(h(req), day1));
    expect(a).not.toContain("203.0.113.7");
    expect(a).toHaveLength(32);
  });

  it("rotates across days and differs per visitor", () => {
    expect(visitorHash(h(req), day1)).not.toBe(visitorHash(h(req), day2));
    expect(visitorHash(h(req), day1)).not.toBe(visitorHash(h({ ...req, "user-agent": "other" }), day1));
  });

  it("returns null with nothing to identify", () => {
    expect(visitorHash(h({}))).toBeNull();
  });
});

describe("recordEvent", () => {
  it("inserts an event", async () => {
    const db = await createTestDb();
    await recordEvent(db, { kind: "kit_download", articleSlug: "a", visitorHash: "v" });
    expect(await db.select().from(events)).toMatchObject([{ kind: "kit_download", articleSlug: "a" }]);
  });

  it("swallows database errors", async () => {
    const db = await createTestDb();
    await expect(
      recordEvent(db, { kind: "view", articleSlug: "a", userId: "missing-user" }),
    ).resolves.toBeUndefined();
  });
});
