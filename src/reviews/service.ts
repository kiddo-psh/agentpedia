import { and, count, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { agentReviews, reviewHelpful, user, type TaskType } from "@/db/schema";
import { DAILY_REVIEW_LIMIT, seoulDayStart } from "./limits";
import { summarizeReviews, type ReviewSummary } from "./summary";
import { validateReview, type ReviewDraft } from "./validate";

export type Result = { ok: true; id: string } | { ok: false; error: string };

export type ReviewView = {
  id: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  model: string | null;
  taskType: TaskType;
  stack: string[];
  rating: number;
  wouldUseAgain: boolean;
  body: string;
  usedSince: string | null;
  createdAt: Date;
  helpfulCount: number;
  helpfulByMe: boolean;
};

export type ReviewPage = {
  reviews: ReviewView[];
  summary: ReviewSummary;
};

type CreateInput = {
  agentSlug: string;
  userId: string;
  model?: string | null;
  taskType: string;
  stack?: string | null;
  rating: number;
  wouldUseAgain: boolean;
  body: string;
  usedSince?: string | null;
  now?: Date;
};

function isUniqueViolation(error: unknown): boolean {
  const wrapped = error as { code?: string; cause?: { code?: string } };
  return wrapped.code === "23505" || wrapped.cause?.code === "23505";
}

export async function createReview(db: Db, input: CreateInput): Promise<Result> {
  const now = input.now ?? new Date();
  const parsed = validateReview({ ...input, now });
  if (!parsed.ok) return parsed;

  // Count and insert share a per-user lock. Without it, two requests can both
  // read 4 and both insert, so the daily cap is not a single check.
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${input.userId}, 0::bigint))`);

    const [{ n }] = await tx
      .select({ n: count() })
      .from(agentReviews)
      .where(and(eq(agentReviews.userId, input.userId), gte(agentReviews.createdAt, seoulDayStart(now))));
    if (Number(n) >= DAILY_REVIEW_LIMIT) {
      return { ok: false, error: `리뷰는 하루에 ${DAILY_REVIEW_LIMIT}건까지 남길 수 있습니다.` };
    }

    const [existing] = await tx
      .select({ id: agentReviews.id })
      .from(agentReviews)
      .where(
        and(
          eq(agentReviews.userId, input.userId),
          eq(agentReviews.agentSlug, input.agentSlug),
          eq(agentReviews.taskType, parsed.value.taskType),
        ),
      )
      .limit(1);
    if (existing) return { ok: false, error: "이 작업에 대한 리뷰를 이미 남겼습니다." };

    try {
      const [row] = await tx
        .insert(agentReviews)
        .values({ ...rowValues(input, parsed.value), createdAt: now, updatedAt: now })
        .returning({ id: agentReviews.id });
      return { ok: true, id: row.id };
    } catch (error) {
      if (isUniqueViolation(error)) return { ok: false, error: "이 작업에 대한 리뷰를 이미 남겼습니다." };
      throw error;
    }
  });
}

function rowValues(input: CreateInput, value: ReviewDraft) {
  return {
    agentSlug: input.agentSlug,
    userId: input.userId,
    model: value.model,
    taskType: value.taskType,
    stack: value.stack,
    rating: value.rating,
    wouldUseAgain: value.wouldUseAgain,
    body: value.body,
    usedSince: value.usedSince,
  };
}

/** Soft delete, author only. The unique slot stays taken. */
export async function deleteReview(db: Db, input: { id: string; userId: string }): Promise<Result> {
  const deleted = await db
    .update(agentReviews)
    .set({ deletedAt: new Date() })
    .where(and(eq(agentReviews.id, input.id), eq(agentReviews.userId, input.userId), isNull(agentReviews.deletedAt)))
    .returning({ id: agentReviews.id });
  return deleted.length > 0 ? { ok: true, id: input.id } : { ok: false, error: "삭제할 수 없는 리뷰입니다." };
}

export async function setReviewHelpful(
  db: Db,
  input: { userId: string; reviewId: string; helpful: boolean },
): Promise<Result> {
  const [review] = await db
    .select({ id: agentReviews.id, deletedAt: agentReviews.deletedAt })
    .from(agentReviews)
    .where(eq(agentReviews.id, input.reviewId));
  if (!review || review.deletedAt) return { ok: false, error: "리뷰를 찾을 수 없습니다." };

  if (input.helpful) {
    await db
      .insert(reviewHelpful)
      .values({ userId: input.userId, reviewId: input.reviewId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(reviewHelpful)
      .where(and(eq(reviewHelpful.userId, input.userId), eq(reviewHelpful.reviewId, input.reviewId)));
  }
  return { ok: true, id: input.reviewId };
}

/** Newest first. Soft-deleted reviews are omitted from the list and the summary. */
export async function listAgentReviews(db: Db, agentSlug: string, userId?: string): Promise<ReviewPage> {
  const rows = await db
    .select({
      id: agentReviews.id,
      model: agentReviews.model,
      taskType: agentReviews.taskType,
      stack: agentReviews.stack,
      rating: agentReviews.rating,
      wouldUseAgain: agentReviews.wouldUseAgain,
      body: agentReviews.body,
      usedSince: agentReviews.usedSince,
      createdAt: agentReviews.createdAt,
      authorId: user.id,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(agentReviews)
    .innerJoin(user, eq(agentReviews.userId, user.id))
    .where(and(eq(agentReviews.agentSlug, agentSlug), isNull(agentReviews.deletedAt)))
    .orderBy(desc(agentReviews.createdAt));

  const ids = rows.map((row) => row.id);
  const votes =
    ids.length === 0
      ? []
      : await db
          .select({ reviewId: reviewHelpful.reviewId, userId: reviewHelpful.userId })
          .from(reviewHelpful)
          .where(inArray(reviewHelpful.reviewId, ids));

  const helpfulCount = new Map<string, number>();
  const helpfulByMe = new Set<string>();
  for (const vote of votes) {
    helpfulCount.set(vote.reviewId, (helpfulCount.get(vote.reviewId) ?? 0) + 1);
    if (userId && vote.userId === userId) helpfulByMe.add(vote.reviewId);
  }

  const reviews: ReviewView[] = rows.map((row) => ({
    id: row.id,
    authorId: row.authorId,
    authorName: row.authorName,
    authorImage: row.authorImage,
    model: row.model,
    taskType: row.taskType,
    stack: row.stack ?? [],
    rating: row.rating,
    wouldUseAgain: row.wouldUseAgain,
    body: row.body,
    usedSince: row.usedSince,
    createdAt: row.createdAt,
    helpfulCount: helpfulCount.get(row.id) ?? 0,
    helpfulByMe: helpfulByMe.has(row.id),
  }));

  return {
    reviews,
    summary: summarizeReviews(reviews),
  };
}
