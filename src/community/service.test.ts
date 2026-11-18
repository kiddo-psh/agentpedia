import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb, insertUser } from "@/db/testing";
import {
  createPost,
  createPostComment,
  deletePost,
  deletePostComment,
  getPost,
  listPostThreads,
  listPosts,
  MAX_COMMUNITY_COMMENT_LENGTH,
  MAX_POST_BODY_LENGTH,
  MAX_POST_TITLE_LENGTH,
} from "./service";

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await insertUser(db, "alice", "앨리스");
  await insertUser(db, "bob", "밥");
});

async function post(userId: string, overrides: Partial<Parameters<typeof createPost>[1]> = {}) {
  const r = await createPost(db, {
    userId,
    title: "제목",
    body: "본문",
    ...overrides,
  });
  if (!r.ok) throw new Error(r.error);
  return r.id;
}

describe("community posts", () => {
  it("creates and lists newest first with author", async () => {
    const older = await post("alice", { title: "먼저", body: "a" });
    const newer = await post("bob", { title: "나중", body: "b", links: ["https://example.com/x"] });

    const list = await listPosts(db);
    expect(list.map((p) => p.id)).toEqual([newer, older]);
    expect(list[0]).toMatchObject({
      title: "나중",
      authorName: "밥",
      links: ["https://example.com/x"],
      articleSlug: null,
      linkKit: false,
    });
  });

  it("stores optional article and kit link when the article has a kit", async () => {
    const id = await post("alice", {
      articleSlug: "demo",
      linkKit: true,
      articleHasKit: true,
    });
    expect(await getPost(db, id)).toMatchObject({
      articleSlug: "demo",
      linkKit: true,
    });
  });

  it("rejects kit link without an article or without a kit", async () => {
    expect(await createPost(db, { userId: "alice", title: "t", body: "b", linkKit: true })).toMatchObject({
      ok: false,
    });
    expect(
      await createPost(db, {
        userId: "alice",
        title: "t",
        body: "b",
        articleSlug: "demo",
        linkKit: true,
        articleHasKit: false,
      }),
    ).toMatchObject({ ok: false });
  });

  it("rejects empty, too-long, and bad links", async () => {
    expect(await createPost(db, { userId: "alice", title: "  ", body: "b" })).toMatchObject({ ok: false });
    expect(await createPost(db, { userId: "alice", title: "t", body: "  " })).toMatchObject({ ok: false });
    expect(
      await createPost(db, { userId: "alice", title: "x".repeat(MAX_POST_TITLE_LENGTH + 1), body: "b" }),
    ).toMatchObject({ ok: false });
    expect(
      await createPost(db, { userId: "alice", title: "t", body: "x".repeat(MAX_POST_BODY_LENGTH + 1) }),
    ).toMatchObject({ ok: false });
    expect(await createPost(db, { userId: "alice", title: "t", body: "b", links: ["ftp://x"] })).toMatchObject({
      ok: false,
    });
  });

  it("normalizes CRLF and lets only the author soft-delete", async () => {
    const id = await post("alice", { body: "줄1\r\n줄2" });
    expect((await getPost(db, id))?.body).toBe("줄1\n줄2");
    expect(await deletePost(db, { id, userId: "bob" })).toMatchObject({ ok: false });
    expect(await deletePost(db, { id, userId: "alice" })).toMatchObject({ ok: true });
    expect(await getPost(db, id)).toBeNull();
    expect(await listPosts(db)).toEqual([]);
  });
});

describe("community post comments", () => {
  it("lists threads with one-level replies", async () => {
    const postId = await post("alice");
    const root = await createPostComment(db, { postId, userId: "bob", body: "  첫 댓글  " });
    if (!root.ok) throw new Error(root.error);
    await createPostComment(db, { postId, userId: "alice", body: "답글", parentId: root.id });

    const threads = await listPostThreads(db, postId);
    expect(threads).toHaveLength(1);
    expect(threads[0]).toMatchObject({ body: "첫 댓글", authorName: "밥" });
    expect(threads[0].replies).toMatchObject([{ body: "답글", authorName: "앨리스" }]);
  });

  it("allows only one level of replies on the same post", async () => {
    const postId = await post("alice");
    const root = await createPostComment(db, { postId, userId: "alice", body: "root" });
    if (!root.ok) throw new Error(root.error);
    const reply = await createPostComment(db, { postId, userId: "bob", body: "reply", parentId: root.id });
    if (!reply.ok) throw new Error(reply.error);

    expect(
      await createPostComment(db, { postId, userId: "alice", body: "deep", parentId: reply.id }),
    ).toEqual({ ok: false, error: "답글에는 다시 답글을 달 수 없습니다." });

    const other = await post("bob");
    expect(
      await createPostComment(db, { postId: other, userId: "alice", body: "x", parentId: root.id }),
    ).toMatchObject({ ok: false });
  });

  it("keeps a deleted root while it has replies and blocks empty bodies", async () => {
    const postId = await post("alice");
    const root = await createPostComment(db, { postId, userId: "alice", body: "root" });
    if (!root.ok) throw new Error(root.error);
    await createPostComment(db, { postId, userId: "bob", body: "reply", parentId: root.id });

    expect(await deletePostComment(db, { id: root.id, userId: "bob" })).toMatchObject({ ok: false });
    expect(await deletePostComment(db, { id: root.id, userId: "alice" })).toMatchObject({ ok: true });

    const [thread] = await listPostThreads(db, postId);
    expect(thread.body).toBeNull();
    expect(thread.replies).toHaveLength(1);

    expect(await createPostComment(db, { postId, userId: "bob", body: "   " })).toMatchObject({ ok: false });
    expect(
      await createPostComment(db, {
        postId,
        userId: "bob",
        body: "x".repeat(MAX_COMMUNITY_COMMENT_LENGTH + 1),
      }),
    ).toMatchObject({ ok: false });
  });
});
