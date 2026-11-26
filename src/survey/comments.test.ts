import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/testing";
import {
  createSurveyComment,
  listSurveyComments,
  moderateSurveyComment,
  parseCommentDraft,
  reportSurveyComment,
} from "./comments";
import { COMMENTS_PER_HOUR, REPORTS_TO_HIDE } from "./limits";

let db: Db;
const visitor = "3f2c8a1e-4b5d-4c6e-9f70-123456789abc";
const now = new Date("2026-11-26T03:00:00Z");

beforeEach(async () => {
  db = await createTestDb();
});

describe("parseCommentDraft", () => {
  it("defaults the nickname and rejects links, length, and the honeypot", () => {
    expect(parseCommentDraft({ nickname: "  ", body: "  좋았어요  ", company: "" })).toMatchObject({
      ok: true,
      nickname: "익명",
      body: "좋았어요",
    });
    expect(parseCommentDraft({ nickname: "alice", body: "https://evil.test", company: "" })).toMatchObject({
      ok: false,
      code: "link",
    });
    expect(parseCommentDraft({ nickname: "evil.dev", body: "안녕", company: "" })).toMatchObject({
      ok: false,
      code: "link",
    });
    expect(parseCommentDraft({ nickname: "", body: "가".repeat(501), company: "" })).toMatchObject({
      ok: false,
      code: "long",
    });
    expect(parseCommentDraft({ nickname: "", body: "안녕", company: "http://spam.test" })).toEqual({
      ok: true,
      dropped: true,
    });
    expect(parseCommentDraft({ nickname: "", body: "  ", company: "" })).toMatchObject({ ok: false, code: "invalid" });
  });
});

describe("survey comments", () => {
  it("stores plain comments and drops a filled honeypot", async () => {
    const saved = await createSurveyComment(db, { visitorId: visitor, nickname: "", body: "<b>안녕</b>", company: "" }, now);
    expect(saved).toMatchObject({ ok: true, dropped: false });
    const dropped = await createSurveyComment(
      db,
      { visitorId: visitor, nickname: "봇", body: "스팸", company: "filled" },
      now,
    );
    expect(dropped).toEqual({ ok: true, dropped: true });
    const comments = await listSurveyComments(db, { includeHidden: false });
    expect(comments.map((comment) => [comment.nickname, comment.body])).toEqual([["익명", "<b>안녕</b>"]]);
  });

  it("caps how many comments one visitor can post in an hour", async () => {
    for (let i = 0; i < COMMENTS_PER_HOUR; i++) {
      expect(
        await createSurveyComment(db, { visitorId: visitor, nickname: "", body: `글 ${i}`, company: "" }, now),
      ).toMatchObject({ ok: true, dropped: false });
    }
    expect(
      await createSurveyComment(db, { visitorId: visitor, nickname: "", body: "하나 더", company: "" }, now),
    ).toMatchObject({ ok: false, code: "rate" });
    expect(
      await createSurveyComment(
        db,
        { visitorId: visitor, nickname: "", body: "한 시간 뒤", company: "" },
        new Date(now.getTime() + 61 * 60 * 1000),
      ),
    ).toMatchObject({ ok: true, dropped: false });
  });

  it("hides a comment after three distinct reports and ignores a repeat from the same visitor", async () => {
    const saved = await createSurveyComment(db, { visitorId: visitor, nickname: "민수", body: "첫 댓글", company: "" }, now);
    if (!saved.ok || saved.dropped || !saved.id) throw new Error("expected a comment");
    const reporters = [
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    ];
    expect(await reportSurveyComment(db, { commentId: saved.id, visitorId: reporters[0]!, company: "" }, now)).toEqual({
      ok: true,
      hidden: false,
    });
    expect(await reportSurveyComment(db, { commentId: saved.id, visitorId: reporters[0]!, company: "" }, now)).toEqual({
      ok: true,
      hidden: false,
    });
    expect(await reportSurveyComment(db, { commentId: saved.id, visitorId: reporters[1]!, company: "" }, now)).toEqual({
      ok: true,
      hidden: false,
    });
    expect(REPORTS_TO_HIDE).toBe(3);
    expect(await reportSurveyComment(db, { commentId: saved.id, visitorId: reporters[2]!, company: "" }, now)).toEqual({
      ok: true,
      hidden: true,
    });
    expect(await listSurveyComments(db, { includeHidden: false })).toEqual([]);
    const hidden = await listSurveyComments(db, { includeHidden: true });
    expect(hidden).toHaveLength(1);
    expect(hidden[0]).toMatchObject({ body: "첫 댓글", hidden: true, hiddenReason: "reports" });
  });

  it("lets an admin hide or delete, and refuses everyone else", async () => {
    const saved = await createSurveyComment(db, { visitorId: visitor, nickname: "", body: "지울 글", company: "" }, now);
    if (!saved.ok || saved.dropped || !saved.id) throw new Error("expected a comment");
    expect(await moderateSurveyComment(db, { id: saved.id, op: "hide", isAdmin: false })).toMatchObject({ ok: false });
    expect(await listSurveyComments(db, { includeHidden: false })).toHaveLength(1);
    expect(await moderateSurveyComment(db, { id: saved.id, op: "delete", isAdmin: true }, now)).toEqual({ ok: true });
    expect(await listSurveyComments(db, { includeHidden: true })).toEqual([]);
  });
});
