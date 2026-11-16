import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb, insertUser } from "@/db/testing";
import { MAX_SUGGESTION_LENGTH, SUGGESTIONS_PER_HOUR } from "./limits";
import { createSuggestion, listSuggestions } from "./service";

let db: Db;
const now = new Date("2026-11-16T10:00:00Z");
const longAgo = new Date("2026-01-01");

beforeEach(async () => {
  db = await createTestDb();
  await insertUser(db, "alice", "앨리스");
});

describe("suggestions", () => {
  it("stores a trimmed suggestion from a signed-in or anonymous reader", async () => {
    expect(await createSuggestion(db, { articleSlug: "a", body: "  오타가 있어요  ", userId: "alice" }, now)).toEqual({ ok: true });
    expect(await createSuggestion(db, { articleSlug: "b", body: "출처 추가", visitorHash: "v1" }, now)).toEqual({ ok: true });

    const rows = await listSuggestions(db, longAgo);
    expect(rows.map((r) => [r.articleSlug, r.body, r.signedIn])).toEqual(
      expect.arrayContaining([
        ["a", "오타가 있어요", true],
        ["b", "출처 추가", false],
      ]),
    );
  });

  it("rejects an empty or over-long body", async () => {
    expect(await createSuggestion(db, { articleSlug: "a", body: "   " }, now)).toMatchObject({ ok: false });
    const long = "가".repeat(MAX_SUGGESTION_LENGTH + 1);
    expect(await createSuggestion(db, { articleSlug: "a", body: long }, now)).toMatchObject({ ok: false });
    expect(await listSuggestions(db, longAgo)).toHaveLength(0);
  });

  it("caps one visitor per hour and lets them send again an hour later", async () => {
    const send = (at: Date) => createSuggestion(db, { articleSlug: "a", body: "건의", visitorHash: "v1" }, at);
    for (let i = 0; i < SUGGESTIONS_PER_HOUR; i++) expect(await send(now)).toEqual({ ok: true });
    expect(await send(now)).toMatchObject({ ok: false, error: "잠시 후 다시 보내 주세요." });
    expect(await createSuggestion(db, { articleSlug: "a", body: "다른 방문자", visitorHash: "v2" }, now)).toEqual({ ok: true });
    expect(await send(new Date(now.getTime() + 61 * 60 * 1000))).toEqual({ ok: true });
  });
});
