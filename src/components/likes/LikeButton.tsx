import { headers } from "next/headers";
import { connection } from "next/server";
import { railButton } from "@/components/reactions/railButton";
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
    // Overlap session with DB connect (same pattern as Comments); like rows still need userId after.
    const [s, db] = await Promise.all([getSession(requestHeaders), getDb()]);
    session = s;
    state = await getLikeState(db, slug, session?.user.id);
  } catch (err) {
    // Likes are secondary: a broken database must not take the article down with it.
    console.error(`[likes] failed to load for ${slug}`, err);
    return null;
  }
  return <LikeToggle slug={slug} initial={state} signedIn={!!session} />;
}

/** Heart + count placeholder so the rail does not read as a missing control while session/DB stream. */
export function LikeButtonSkeleton() {
  return (
    <span className={railButton} aria-hidden>
      <HeartIcon />
      <span className="text-muted">·</span>
    </span>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinejoin="round"
        d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.5 0 5.7 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"
      />
    </svg>
  );
}
