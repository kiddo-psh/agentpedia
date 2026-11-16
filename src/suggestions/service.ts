import { and, count, desc, eq, gte } from "drizzle-orm";
import type { Db } from "@/db/client";
import { suggestions } from "@/db/schema";
import { MAX_SUGGESTION_LENGTH, SUGGESTIONS_PER_HOUR } from "./limits";

export type SuggestionInput = {
  articleSlug: string;
  body: string;
  userId?: string | null;
  visitorHash?: string | null;
};

export async function createSuggestion(
  db: Db,
  input: SuggestionInput,
  now = new Date(),
): Promise<{ ok: true } | { ok: false; error: string }> {
  const body = input.body.trim();
  if (!body) return { ok: false, error: "건의 내용을 적어 주세요." };
  if (body.length > MAX_SUGGESTION_LENGTH) {
    return { ok: false, error: `${MAX_SUGGESTION_LENGTH}자 이하로 적어 주세요.` };
  }

  // Signed-in readers are limited by account, anonymous ones by visitor hash.
  const who = input.userId ? eq(suggestions.userId, input.userId) : input.visitorHash ? eq(suggestions.visitorHash, input.visitorHash) : null;
  if (who) {
    const since = new Date(now.getTime() - 60 * 60 * 1000);
    const [{ n }] = await db
      .select({ n: count() })
      .from(suggestions)
      .where(and(who, gte(suggestions.createdAt, since)));
    if (n >= SUGGESTIONS_PER_HOUR) return { ok: false, error: "잠시 후 다시 보내 주세요." };
  }

  await db.insert(suggestions).values({
    articleSlug: input.articleSlug,
    body,
    userId: input.userId ?? null,
    visitorHash: input.visitorHash ?? null,
    createdAt: now,
  });
  return { ok: true };
}

/** Newest first, for the owner's review. */
export async function listSuggestions(db: Db, since: Date) {
  return db
    .select({
      articleSlug: suggestions.articleSlug,
      body: suggestions.body,
      signedIn: suggestions.userId,
      createdAt: suggestions.createdAt,
    })
    .from(suggestions)
    .where(gte(suggestions.createdAt, since))
    .orderBy(desc(suggestions.createdAt))
    .then((rows) => rows.map((r) => ({ ...r, signedIn: r.signedIn !== null })));
}
