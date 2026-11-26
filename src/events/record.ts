import { createHash, randomUUID } from "node:crypto";
import type { Db } from "@/db/client";
import { events, type EventKind } from "@/db/schema";

export type TrackedEvent = {
  kind: EventKind;
  articleSlug: string;
  visitorHash?: string | null;
  visitorId?: string | null;
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

export const VISITOR_COOKIE = "ap_vid";
/** Fixed lifetime, never refreshed: an ID covers exactly the four weeks after a first visit. */
export const VISITOR_COOKIE_MAX_AGE = 28 * 86_400;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The anonymous visitor ID from the request's cookie, or a fresh one with the `Set-Cookie`
 * value that stores it. The ID is random and carries no personal data.
 */
/** The visitor cookie if this request already has one. Does not mint a new id. */
export function existingVisitorId(cookieHeader: string | null): string | null {
  const sent = cookieHeader
    ?.split(";")
    .map((c) => c.trim().split("="))
    .find(([name]) => name === VISITOR_COOKIE)?.[1];
  if (sent && UUID.test(sent)) return sent.toLowerCase();
  return null;
}

export function visitorId(request: Request): { id: string; setCookie: string | null } {
  const sent = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim().split("="))
    .find(([name]) => name === VISITOR_COOKIE)?.[1];
  if (sent && UUID.test(sent)) return { id: sent.toLowerCase(), setCookie: null };
  const id = randomUUID();
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return {
    id,
    setCookie: `${VISITOR_COOKIE}=${id}; Path=/; Max-Age=${VISITOR_COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`,
  };
}

/** Never throws: analytics must not break the request that triggered it. */
export async function recordEvent(db: Db, e: TrackedEvent): Promise<void> {
  try {
    await db.insert(events).values({
      kind: e.kind,
      articleSlug: e.articleSlug,
      visitorHash: e.visitorHash ?? null,
      visitorId: e.visitorId ?? null,
      userId: e.userId ?? null,
    });
  } catch (err) {
    console.error("[events] failed to record", e.kind, e.articleSlug, err);
  }
}
