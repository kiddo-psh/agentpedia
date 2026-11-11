import { and, asc, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { comments, user } from "@/db/schema";
import { MAX_COMMENT_LENGTH } from "./limits";

export { MAX_COMMENT_LENGTH };

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

export type Result = { ok: true; id: string } | { ok: false; error: string };

/** Roots oldest-first, each with replies oldest-first. Deleted roots without replies are dropped. */
export async function listThreads(db: Db, articleSlug: string): Promise<Thread[]> {
  const rows = await db
    .select({
      id: comments.id,
      parentId: comments.parentId,
      body: comments.body,
      deletedAt: comments.deletedAt,
      createdAt: comments.createdAt,
      authorId: user.id,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(comments)
    .innerJoin(user, eq(comments.userId, user.id))
    .where(eq(comments.articleSlug, articleSlug))
    .orderBy(asc(comments.createdAt));

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

export async function createComment(
  db: Db,
  input: { articleSlug: string; userId: string; body: string; parentId?: string | null },
): Promise<Result> {
  // Browsers submit textarea newlines as CRLF.
  const body = input.body.replace(/\r\n?/g, "\n").trim();
  if (!body) return { ok: false, error: "내용을 입력하세요." };
  if (body.length > MAX_COMMENT_LENGTH) {
    return { ok: false, error: `댓글은 ${MAX_COMMENT_LENGTH}자까지 쓸 수 있습니다.` };
  }

  if (input.parentId) {
    const [parent] = await db.select().from(comments).where(eq(comments.id, input.parentId));
    if (!parent || parent.articleSlug !== input.articleSlug || parent.deletedAt) {
      return { ok: false, error: "답글을 달 댓글을 찾을 수 없습니다." };
    }
    if (parent.parentId) return { ok: false, error: "답글에는 다시 답글을 달 수 없습니다." };
  }

  const [row] = await db
    .insert(comments)
    .values({ articleSlug: input.articleSlug, userId: input.userId, body, parentId: input.parentId ?? null })
    .returning({ id: comments.id });
  return { ok: true, id: row.id };
}

/** Soft delete, author only. */
export async function deleteComment(db: Db, input: { id: string; userId: string }): Promise<Result> {
  const deleted = await db
    .update(comments)
    .set({ deletedAt: new Date() })
    .where(and(eq(comments.id, input.id), eq(comments.userId, input.userId), isNull(comments.deletedAt)))
    .returning({ id: comments.id });
  return deleted.length > 0 ? { ok: true, id: input.id } : { ok: false, error: "삭제할 수 없는 댓글입니다." };
}
