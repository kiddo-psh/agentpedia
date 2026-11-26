import { and, count, eq, gte, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { surveyCommentReports, surveyComments } from "@/db/schema";
import { SURVEY_POST } from "./post";
import {
  ANON_NICKNAME,
  COMMENTS_PER_HOUR,
  MAX_COMMENT_LENGTH,
  MAX_NICKNAME_LENGTH,
  REPORTS_PER_HOUR,
  REPORTS_TO_HIDE,
} from "./limits";
import { containsLink } from "./links";
import { honeypotFilled } from "./validate";

export type CommentCode = "invalid" | "link" | "long" | "nickname" | "rate";

export type CommentDraft =
  | { ok: true; dropped: true }
  | { ok: true; dropped: false; nickname: string; body: string }
  | { ok: false; code: CommentCode; error: string };

const HOUR_MS = 60 * 60 * 1000;

function normalize(raw: string): string {
  return raw.replace(/\r\n?/g, "\n").trim();
}

export function parseCommentDraft(input: { nickname: string; body: string; company: string }): CommentDraft {
  if (honeypotFilled(input.company)) return { ok: true, dropped: true };

  const nickname = input.nickname.replace(/[\r\n\t]+/g, " ").trim();
  const body = normalize(input.body);
  if (!body) return { ok: false, code: "invalid", error: "댓글을 입력하세요." };
  if (body.length > MAX_COMMENT_LENGTH) {
    return { ok: false, code: "long", error: `댓글은 ${MAX_COMMENT_LENGTH}자까지 쓸 수 있습니다.` };
  }
  const name = nickname || ANON_NICKNAME;
  if (name.length > MAX_NICKNAME_LENGTH) {
    return { ok: false, code: "nickname", error: `이름은 ${MAX_NICKNAME_LENGTH}자까지 쓸 수 있습니다.` };
  }
  if (containsLink(name) || containsLink(body)) {
    return { ok: false, code: "link", error: "댓글에는 링크를 넣을 수 없습니다." };
  }
  return { ok: true, dropped: false, nickname: name, body };
}

export async function createSurveyComment(
  db: Db,
  input: { visitorId: string; nickname: string; body: string; company: string; postSlug?: string; parentId?: string | null },
  now = new Date(),
): Promise<{ ok: true; dropped: boolean; id?: string } | { ok: false; code: CommentCode; error: string }> {
  const draft = parseCommentDraft(input);
  if (!draft.ok) return draft;
  if (draft.dropped) return { ok: true, dropped: true };
  if ((input.postSlug ?? SURVEY_POST.slug) !== SURVEY_POST.slug) {
    return { ok: false, code: "invalid", error: "글을 찾을 수 없습니다." };
  }

  const parentId = input.parentId?.trim() || null;
  if (parentId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parentId)) {
    return { ok: false, code: "invalid", error: "답글을 달 댓글을 찾을 수 없습니다." };
  }
  if (parentId) {
    const [parent] = await db
      .select({
        id: surveyComments.id,
        parentId: surveyComments.parentId,
        deletedAt: surveyComments.deletedAt,
        postSlug: surveyComments.postSlug,
      })
      .from(surveyComments)
      .where(eq(surveyComments.id, parentId));
    if (!parent || parent.deletedAt || parent.postSlug !== SURVEY_POST.slug) {
      return { ok: false, code: "invalid", error: "답글을 달 댓글을 찾을 수 없습니다." };
    }
    if (parent.parentId) return { ok: false, code: "invalid", error: "답글에는 다시 답글을 달 수 없습니다." };
  }

  const since = new Date(now.getTime() - HOUR_MS);
  const [{ n }] = await db
    .select({ n: count() })
    .from(surveyComments)
    .where(and(eq(surveyComments.visitorId, input.visitorId), gte(surveyComments.createdAt, since)));
  if (n >= COMMENTS_PER_HOUR) {
    return { ok: false, code: "rate", error: "댓글을 너무 자주 남겼습니다. 잠시 후 다시 시도해 주세요." };
  }

  const [row] = await db
    .insert(surveyComments)
    .values({
      postSlug: SURVEY_POST.slug,
      visitorId: input.visitorId,
      parentId,
      nickname: draft.nickname,
      body: draft.body,
      createdAt: now,
    })
    .returning({ id: surveyComments.id });
  return { ok: true, dropped: false, id: row.id };
}

export type SurveyCommentView = {
  id: string;
  nickname: string;
  /** Null when the public page shows a placeholder instead of the body. */
  body: string | null;
  createdAt: Date;
  hidden: boolean;
  hiddenReason: string | null;
  /** Public stand-in for a hidden root that still has visible replies. */
  placeholder: boolean;
};

export type SurveyThread = SurveyCommentView & { replies: SurveyCommentView[] };

export async function listSurveyComments(
  db: Db,
  opts: { includeHidden: boolean },
): Promise<SurveyThread[]> {
  const rows = await db
    .select({
      id: surveyComments.id,
      parentId: surveyComments.parentId,
      nickname: surveyComments.nickname,
      body: surveyComments.body,
      createdAt: surveyComments.createdAt,
      hiddenAt: surveyComments.hiddenAt,
      hiddenReason: surveyComments.hiddenReason,
    })
    .from(surveyComments)
    .where(and(eq(surveyComments.postSlug, SURVEY_POST.slug), isNull(surveyComments.deletedAt)))
    .orderBy(surveyComments.createdAt);

  const view = (row: (typeof rows)[number], placeholder: boolean): SurveyCommentView => ({
    id: row.id,
    nickname: row.nickname,
    body: placeholder ? null : row.body,
    createdAt: row.createdAt,
    hidden: row.hiddenAt !== null,
    hiddenReason: row.hiddenReason,
    placeholder,
  });

  const replies = new Map<string, SurveyCommentView[]>();
  for (const row of rows) {
    if (!row.parentId) continue;
    if (!opts.includeHidden && row.hiddenAt) continue;
    const list = replies.get(row.parentId) ?? [];
    list.push(view(row, false));
    replies.set(row.parentId, list);
  }

  const threads: SurveyThread[] = [];
  for (const row of rows) {
    if (row.parentId) continue;
    const children = replies.get(row.id) ?? [];
    const placeholder = !opts.includeHidden && row.hiddenAt !== null;
    if (placeholder && children.length === 0) continue;
    threads.push({ ...view(row, placeholder), replies: children });
  }
  return threads;
}

export async function reportSurveyComment(
  db: Db,
  input: { commentId: string; visitorId: string; company: string },
  now = new Date(),
): Promise<{ ok: true; hidden: boolean } | { ok: false; code: "rate" | "missing"; error: string }> {
  if (honeypotFilled(input.company)) return { ok: true, hidden: false };

  const [comment] = await db
    .select({
      id: surveyComments.id,
      hiddenAt: surveyComments.hiddenAt,
      deletedAt: surveyComments.deletedAt,
    })
    .from(surveyComments)
    .where(eq(surveyComments.id, input.commentId));
  if (!comment || comment.deletedAt) return { ok: false, code: "missing", error: "댓글을 찾을 수 없습니다." };
  if (comment.hiddenAt) return { ok: true, hidden: true };

  const since = new Date(now.getTime() - HOUR_MS);
  const [{ n }] = await db
    .select({ n: count() })
    .from(surveyCommentReports)
    .where(and(eq(surveyCommentReports.visitorId, input.visitorId), gte(surveyCommentReports.createdAt, since)));
  if (n >= REPORTS_PER_HOUR) {
    return { ok: false, code: "rate", error: "신고를 너무 자주 남겼습니다. 잠시 후 다시 시도해 주세요." };
  }

  return db.transaction(async (tx) => {
    // Lock the comment so concurrent reports count each other's inserts before deciding to hide.
    const [locked] = await tx
      .select({
        id: surveyComments.id,
        hiddenAt: surveyComments.hiddenAt,
        deletedAt: surveyComments.deletedAt,
      })
      .from(surveyComments)
      .where(eq(surveyComments.id, input.commentId))
      .for("update");
    if (!locked || locked.deletedAt) return { ok: false as const, code: "missing" as const, error: "댓글을 찾을 수 없습니다." };
    if (locked.hiddenAt) return { ok: true as const, hidden: true };

    await tx
      .insert(surveyCommentReports)
      .values({ commentId: input.commentId, visitorId: input.visitorId, createdAt: now })
      .onConflictDoNothing();
    const [{ reports }] = await tx
      .select({ reports: count() })
      .from(surveyCommentReports)
      .where(eq(surveyCommentReports.commentId, input.commentId));
    if (reports < REPORTS_TO_HIDE) return { ok: true as const, hidden: false };
    await tx
      .update(surveyComments)
      .set({ hiddenAt: now, hiddenReason: "reports" })
      .where(and(eq(surveyComments.id, input.commentId), isNull(surveyComments.hiddenAt)));
    return { ok: true as const, hidden: true };
  });
}

export async function moderateSurveyComment(
  db: Db,
  input: { id: string; op: "hide" | "delete"; isAdmin: boolean },
  now = new Date(),
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.isAdmin) return { ok: false, error: "forbidden" };
  if (input.op === "hide") {
    const updated = await db
      .update(surveyComments)
      .set({ hiddenAt: now, hiddenReason: "admin" })
      .where(and(eq(surveyComments.id, input.id), isNull(surveyComments.deletedAt)))
      .returning({ id: surveyComments.id });
    return updated.length > 0 ? { ok: true } : { ok: false, error: "댓글을 찾을 수 없습니다." };
  }
  const updated = await db
    .update(surveyComments)
    .set({ deletedAt: now })
    .where(and(eq(surveyComments.id, input.id), isNull(surveyComments.deletedAt)))
    .returning({ id: surveyComments.id });
  return updated.length > 0 ? { ok: true } : { ok: false, error: "댓글을 찾을 수 없습니다." };
}
