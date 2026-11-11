import { createHash } from "node:crypto";
import type { Db } from "@/db/client";
import { events, type EventKind } from "@/db/schema";

export type TrackedEvent = {
  kind: EventKind;
  articleSlug: string;
  visitorHash?: string | null;
  userId?: string | null;
};

/**
 * Daily-rotating, salted hash of IP + user agent. Lets us count distinct visitors per day
 * without storing either value, and cannot be joined across days.
 */
export function visitorHash(headers: Headers, now = new Date()): string | null {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip");
  const ua = headers.get("user-agent") ?? "";
  if (!ip && !ua) return null;
  const day = now.toISOString().slice(0, 10);
  const salt = process.env.EVENT_SALT ?? "dev-salt";
  return createHash("sha256").update(`${day}|${salt}|${ip ?? ""}|${ua}`).digest("hex").slice(0, 32);
}

/** Never throws: analytics must not break the request that triggered it. */
export async function recordEvent(db: Db, e: TrackedEvent): Promise<void> {
  try {
    await db.insert(events).values({
      kind: e.kind,
      articleSlug: e.articleSlug,
      visitorHash: e.visitorHash ?? null,
      userId: e.userId ?? null,
    });
  } catch (err) {
    console.error("[events] failed to record", e.kind, e.articleSlug, err);
  }
}
