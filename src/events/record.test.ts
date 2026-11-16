import { describe, expect, it } from "vitest";
import { events } from "@/db/schema";
import { createTestDb } from "@/db/testing";
import { recordEvent, VISITOR_COOKIE_MAX_AGE, visitorHash, visitorId } from "./record";

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

describe("visitorId", () => {
  const id = "3f2c8a1e-4b5d-4c6e-9f70-123456789abc";
  const req = (url: string, cookie?: string) => new Request(url, { headers: cookie ? { cookie } : {} });

  it("reuses the ID from the cookie without setting it again", () => {
    expect(visitorId(req("https://x.test/api/events", `theme=dark; ap_vid=${id}`))).toEqual({ id, setCookie: null });
  });

  it("issues a fresh random ID with a fixed 28-day cookie when none or a bad one is sent", () => {
    for (const cookie of [undefined, "ap_vid=not-a-uuid"]) {
      const v = visitorId(req("https://x.test/api/events", cookie));
      expect(v.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(v.setCookie).toBe(`ap_vid=${v.id}; Path=/; Max-Age=${VISITOR_COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax; Secure`);
    }
    expect(visitorId(req("http://localhost:3000/api/events")).setCookie).not.toContain("Secure");
    expect(visitorId(req("https://x.test/")).id).not.toBe(visitorId(req("https://x.test/")).id);
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
