import { and, count, desc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { likes } from "@/db/schema";

export type LikeState = { count: number; liked: boolean };

/** Sets the like to the wanted state, so a repeated click or a retry changes nothing. */
export async function setLike(
  db: Db,
  input: { userId: string; articleSlug: string; liked: boolean },
): Promise<void> {
  if (input.liked) {
    await db.insert(likes).values({ userId: input.userId, articleSlug: input.articleSlug }).onConflictDoNothing();
  } else {
    await db.delete(likes).where(and(eq(likes.userId, input.userId), eq(likes.articleSlug, input.articleSlug)));
  }
}

export async function getLikeState(db: Db, articleSlug: string, userId?: string): Promise<LikeState> {
  const [[total], mine] = await Promise.all([
    db.select({ n: count() }).from(likes).where(eq(likes.articleSlug, articleSlug)),
    userId
      ? db
          .select({ slug: likes.articleSlug })
          .from(likes)
          .where(and(eq(likes.articleSlug, articleSlug), eq(likes.userId, userId)))
      : Promise.resolve([]),
  ]);
  return { count: total.n, liked: mine.length > 0 };
}

/** Most recently liked first. */
export async function listLikedSlugs(db: Db, userId: string): Promise<string[]> {
  const rows = await db
    .select({ slug: likes.articleSlug })
    .from(likes)
    .where(eq(likes.userId, userId))
    .orderBy(desc(likes.createdAt));
  return rows.map((r) => r.slug);
}
