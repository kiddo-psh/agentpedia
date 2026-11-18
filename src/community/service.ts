import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { communityComments, communityPosts, user } from "@/db/schema";
import {
  MAX_COMMUNITY_COMMENT_LENGTH,
  MAX_POST_BODY_LENGTH,
  MAX_POST_LINKS,
  MAX_POST_TITLE_LENGTH,
} from "./limits";

export {
  MAX_COMMUNITY_COMMENT_LENGTH,
  MAX_POST_BODY_LENGTH,
  MAX_POST_LINKS,
  MAX_POST_TITLE_LENGTH,
};

export type Result = { ok: true; id: string } | { ok: false; error: string };

export type PostView = {
  id: string;
  title: string;
  body: string;
  links: string[];
  articleSlug: string | null;
  linkKit: boolean;
  createdAt: Date;
  authorId: string;
  authorName: string;
  authorImage: string | null;
};

export type CommentView = {
  id: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  /** null when deleted; the row stays so its replies keep their context. */
  body: string | null;
  createdAt: Date;
};
export type Thread = CommentView & { replies: CommentView[] };

function normalizeMultiline(raw: string): string {
  // Browsers submit textarea newlines as CRLF.
  return raw.replace(/\r\n?/g, "\n").trim();
}

function parseLinks(raw: string[]): { ok: true; links: string[] } | { ok: false; error: string } {
  const links: string[] = [];
  for (const item of raw) {
    const link = item.trim();
    if (!link) continue;
    let url: URL;
    try {
      url = new URL(link);
    } catch {
      return { ok: false, error: "외부 링크는 http(s) URL이어야 합니다." };
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, error: "외부 링크는 http(s) URL이어야 합니다." };
    }
    links.push(url.toString());
  }
  if (links.length > MAX_POST_LINKS) {
    return { ok: false, error: `외부 링크는 ${MAX_POST_LINKS}개까지 넣을 수 있습니다.` };
  }
  return { ok: true, links };
}

export type CreatePostInput = {
  userId: string;
  title: string;
  body: string;
  links?: string[];
  articleSlug?: string | null;
  linkKit?: boolean;
  /** When articleSlug is set, caller must confirm the article exists (and has a kit if linkKit). */
  articleHasKit?: boolean;
};

export async function createPost(db: Db, input: CreatePostInput): Promise<Result> {
  const title = normalizeMultiline(input.title).replace(/\n/g, " ");
  const body = normalizeMultiline(input.body);
  if (!title) return { ok: false, error: "제목을 입력하세요." };
  if (title.length > MAX_POST_TITLE_LENGTH) {
    return { ok: false, error: `제목은 ${MAX_POST_TITLE_LENGTH}자까지 쓸 수 있습니다.` };
  }
  if (!body) return { ok: false, error: "내용을 입력하세요." };
  if (body.length > MAX_POST_BODY_LENGTH) {
    return { ok: false, error: `본문은 ${MAX_POST_BODY_LENGTH}자까지 쓸 수 있습니다.` };
  }

  const parsed = parseLinks(input.links ?? []);
  if (!parsed.ok) return parsed;

  const articleSlug = input.articleSlug?.trim() || null;
  const linkKit = Boolean(input.linkKit);
  if (linkKit && !articleSlug) {
    return { ok: false, error: "키트를 연결하려면 기사를 선택하세요." };
  }
  if (linkKit && !input.articleHasKit) {
    return { ok: false, error: "이 기사에는 적용 키트가 없습니다." };
  }

  const [row] = await db
    .insert(communityPosts)
    .values({
      userId: input.userId,
      title,
      body,
      links: parsed.links,
      articleSlug,
      linkKit,
    })
    .returning({ id: communityPosts.id });
  return { ok: true, id: row.id };
}

/** Soft delete, author only. */
export async function deletePost(db: Db, input: { id: string; userId: string }): Promise<Result> {
  const deleted = await db
    .update(communityPosts)
    .set({ deletedAt: new Date() })
    .where(
      and(eq(communityPosts.id, input.id), eq(communityPosts.userId, input.userId), isNull(communityPosts.deletedAt)),
    )
    .returning({ id: communityPosts.id });
  return deleted.length > 0 ? { ok: true, id: input.id } : { ok: false, error: "삭제할 수 없는 글입니다." };
}

export async function getPost(db: Db, id: string): Promise<PostView | null> {
  const [row] = await db
    .select({
      id: communityPosts.id,
      title: communityPosts.title,
      body: communityPosts.body,
      links: communityPosts.links,
      articleSlug: communityPosts.articleSlug,
      linkKit: communityPosts.linkKit,
      createdAt: communityPosts.createdAt,
      deletedAt: communityPosts.deletedAt,
      authorId: user.id,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(communityPosts)
    .innerJoin(user, eq(communityPosts.userId, user.id))
    .where(eq(communityPosts.id, id));
  if (!row || row.deletedAt) return null;
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    links: row.links ?? [],
    articleSlug: row.articleSlug,
    linkKit: row.linkKit,
    createdAt: row.createdAt,
    authorId: row.authorId,
    authorName: row.authorName,
    authorImage: row.authorImage,
  };
}

/** Newest first; soft-deleted posts are omitted. */
export async function listPosts(db: Db, limit = 50): Promise<PostView[]> {
  const rows = await db
    .select({
      id: communityPosts.id,
      title: communityPosts.title,
      body: communityPosts.body,
      links: communityPosts.links,
      articleSlug: communityPosts.articleSlug,
      linkKit: communityPosts.linkKit,
      createdAt: communityPosts.createdAt,
      authorId: user.id,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(communityPosts)
    .innerJoin(user, eq(communityPosts.userId, user.id))
    .where(isNull(communityPosts.deletedAt))
    .orderBy(desc(communityPosts.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    links: r.links ?? [],
    articleSlug: r.articleSlug,
    linkKit: r.linkKit,
    createdAt: r.createdAt,
    authorId: r.authorId,
    authorName: r.authorName,
    authorImage: r.authorImage,
  }));
}

/** Roots oldest-first, each with replies oldest-first. Deleted roots without replies are dropped. */
export async function listPostThreads(db: Db, postId: string): Promise<Thread[]> {
  const rows = await db
    .select({
      id: communityComments.id,
      parentId: communityComments.parentId,
      body: communityComments.body,
      deletedAt: communityComments.deletedAt,
      createdAt: communityComments.createdAt,
      authorId: user.id,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(communityComments)
    .innerJoin(user, eq(communityComments.userId, user.id))
    .where(eq(communityComments.postId, postId))
    .orderBy(asc(communityComments.createdAt));

  const view = (r: (typeof rows)[number]): CommentView => ({
    id: r.id,
    authorId: r.authorId,
    authorName: r.authorName,
    authorImage: r.authorImage,
    body: r.deletedAt ? null : r.body,
    createdAt: r.createdAt,
  });

  const threads = new Map<string, Thread>();
  for (const r of rows) if (!r.parentId) threads.set(r.id, { ...view(r), replies: [] });
  for (const r of rows) {
    if (r.parentId && !r.deletedAt) threads.get(r.parentId)?.replies.push(view(r));
  }
  return [...threads.values()].filter((t) => t.body !== null || t.replies.length > 0);
}

export async function createPostComment(
  db: Db,
  input: { postId: string; userId: string; body: string; parentId?: string | null },
): Promise<Result> {
  const body = normalizeMultiline(input.body);
  if (!body) return { ok: false, error: "내용을 입력하세요." };
  if (body.length > MAX_COMMUNITY_COMMENT_LENGTH) {
    return { ok: false, error: `댓글은 ${MAX_COMMUNITY_COMMENT_LENGTH}자까지 쓸 수 있습니다.` };
  }

  const [post] = await db
    .select({ id: communityPosts.id, deletedAt: communityPosts.deletedAt })
    .from(communityPosts)
    .where(eq(communityPosts.id, input.postId));
  if (!post || post.deletedAt) return { ok: false, error: "글을 찾을 수 없습니다." };

  if (input.parentId) {
    const [parent] = await db
      .select()
      .from(communityComments)
      .where(eq(communityComments.id, input.parentId));
    if (!parent || parent.postId !== input.postId || parent.deletedAt) {
      return { ok: false, error: "답글을 달 댓글을 찾을 수 없습니다." };
    }
    if (parent.parentId) return { ok: false, error: "답글에는 다시 답글을 달 수 없습니다." };
  }

  const [row] = await db
    .insert(communityComments)
    .values({
      postId: input.postId,
      userId: input.userId,
      body,
      parentId: input.parentId ?? null,
    })
    .returning({ id: communityComments.id });
  return { ok: true, id: row.id };
}

/** Soft delete, author only. */
export async function deletePostComment(
  db: Db,
  input: { id: string; userId: string },
): Promise<Result> {
  const deleted = await db
    .update(communityComments)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(communityComments.id, input.id),
        eq(communityComments.userId, input.userId),
        isNull(communityComments.deletedAt),
      ),
    )
    .returning({ id: communityComments.id });
  return deleted.length > 0 ? { ok: true, id: input.id } : { ok: false, error: "삭제할 수 없는 댓글입니다." };
}
