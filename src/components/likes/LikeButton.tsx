import { headers } from "next/headers";
import { connection } from "next/server";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import { getLikeState, type LikeState } from "@/likes/service";
import { LikeToggle } from "./LikeToggle";

/** Request-time data (session, live count): render inside a Suspense boundary. */
export async function LikeButton({ slug }: { slug: string }) {
  await connection();
  const requestHeaders = await headers();
  let session: Awaited<ReturnType<typeof getSession>>;
  let state: LikeState;
  try {
    session = await getSession(requestHeaders);
    state = await getDb().then((db) => getLikeState(db, slug, session?.user.id));
  } catch (err) {
    // Likes are secondary: a broken database must not take the article down with it.
    console.error(`[likes] failed to load for ${slug}`, err);
    return null;
  }
  return <LikeToggle slug={slug} initial={state} signedIn={!!session} />;
}

export function LikeButtonSkeleton() {
  return <span className="inline-block h-9 w-16 rounded-full bg-soft" aria-hidden />;
}
