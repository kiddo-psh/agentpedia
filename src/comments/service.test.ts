import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb, insertUser } from "@/db/testing";
import { createComment, deleteComment, listThreads, MAX_COMMENT_LENGTH } from "./service";

let db: Db;
const A = "article-a";

beforeEach(async () => {
  db = await createTestDb();
  await insertUser(db, "alice", "앨리스");
  await insertUser(db, "bob", "밥");
});

async function post(userId: string, body: string, parentId?: string, articleSlug = A) {
  const r = await createComment(db, { articleSlug, userId, body, parentId });
  if (!r.ok) throw new Error(r.error);
  return r.id;
}

describe("comments", () => {
  it("lists threads per article with replies under their root", async () => {
    const root = await post("alice", "  첫 댓글  ");
    await post("bob", "답글", root);
    await post("bob", "다른 기사", undefined, "article-b");

    const threads = await listThreads(db, A);
    expect(threads).toHaveLength(1);
    expect(threads[0]).toMatchObject({ body: "첫 댓글", authorName: "앨리스" });
    expect(threads[0].replies).toMatchObject([{ body: "답글", authorName: "밥" }]);
  });

  it("normalizes CRLF newlines from form posts", async () => {
    await post("alice", "줄1\r\n줄2");
    expect((await listThreads(db, A))[0].body).toBe("줄1\n줄2");
  });

  it("rejects empty and too-long bodies", async () => {
    expect(await createComment(db, { articleSlug: A, userId: "alice", body: "   " })).toMatchObject({ ok: false });
    expect(
      await createComment(db, { articleSlug: A, userId: "alice", body: "x".repeat(MAX_COMMENT_LENGTH + 1) }),
    ).toMatchObject({ ok: false });
  });

  it("allows only one level of replies, on the same article", async () => {
    const root = await post("alice", "root");
    const reply = await post("bob", "reply", root);
    expect(await createComment(db, { articleSlug: A, userId: "alice", body: "deep", parentId: reply })).toEqual({
      ok: false,
      error: "답글에는 다시 답글을 달 수 없습니다.",
    });
    expect(
      await createComment(db, { articleSlug: "article-b", userId: "alice", body: "x", parentId: root }),
    ).toMatchObject({ ok: false });
  });

  it("lets only the author delete, and keeps a deleted root while it has replies", async () => {
    const root = await post("alice", "root");
    await post("bob", "reply", root);

    expect(await deleteComment(db, { id: root, userId: "bob" })).toMatchObject({ ok: false });
    expect(await deleteComment(db, { id: root, userId: "alice" })).toMatchObject({ ok: true });

    const [thread] = await listThreads(db, A);
    expect(thread.body).toBeNull();
    expect(thread.replies).toHaveLength(1);
  });

  it("drops a deleted root with no replies and blocks replying to it", async () => {
    const root = await post("alice", "root");
    await deleteComment(db, { id: root, userId: "alice" });
    expect(await listThreads(db, A)).toEqual([]);
    expect(await createComment(db, { articleSlug: A, userId: "bob", body: "x", parentId: root })).toMatchObject({
      ok: false,
    });
  });
});
