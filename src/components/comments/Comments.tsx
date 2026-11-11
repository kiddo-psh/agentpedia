import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { listThreads, type CommentView } from "@/comments/service";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import { CommentForm } from "./CommentForm";
import { DeleteButton, ReplyBox } from "./ReplyBox";

const timeFormat = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

/** Request-time data (session, live comments): render inside a Suspense boundary. */
export async function Comments({ slug }: { slug: string }) {
  // Auth and DB code read the clock; mark this subtree request-time before touching them.
  await connection();
  const [session, threads] = await Promise.all([
    getSession(await headers()),
    getDb().then((db) => listThreads(db, slug)),
  ]);
  const me = session?.user.id;
  const count = threads.reduce((n, t) => n + (t.body !== null ? 1 : 0) + t.replies.length, 0);

  return (
    <>
      <h2 id="comments-title" className="text-xl font-bold">
        토론 <span className="text-muted">{count}</span>
      </h2>

      <div className="mt-4">
        {session ? (
          <CommentForm slug={slug} />
        ) : (
          <p className="rounded-lg border border-dashed border-foreground/20 px-4 py-3 text-sm text-muted">
            <Link href={`/login?next=${encodeURIComponent(`/a/${slug}#comments`)}`} className="underline">
              로그인
            </Link>
            하고 토론에 참여하세요.
          </p>
        )}
      </div>

      {threads.length === 0 ? (
        <p className="mt-8 text-sm text-muted">아직 댓글이 없습니다. 첫 의견을 남겨 주세요.</p>
      ) : (
        <ul className="mt-8 grid gap-6">
          {threads.map((t) => (
            <li key={t.id}>
              <Comment c={t} me={me} />
              <div className="mt-2 pl-11">
                {session && t.body !== null && <ReplyBox slug={slug} parentId={t.id} />}
                {t.replies.length > 0 && (
                  <ul className="mt-3 grid gap-4 border-l border-foreground/10 pl-4">
                    {t.replies.map((r) => (
                      <li key={r.id}>
                        <Comment c={r} me={me} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Comment({ c, me }: { c: CommentView; me?: string }) {
  return (
    <article className="flex gap-3">
      {c.authorImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar URLs come from arbitrary OAuth hosts
        <img src={c.authorImage} alt="" className="size-8 shrink-0 rounded-full" />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground/10 text-sm font-semibold">
          {c.authorName.slice(0, 1)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 text-sm">
          <span className="font-semibold">{c.authorName}</span>
          <time className="text-xs text-muted" dateTime={c.createdAt.toISOString()}>
            {timeFormat.format(c.createdAt)}
          </time>
          {c.body !== null && c.authorId === me && (
            <span className="ml-auto">
              <DeleteButton id={c.id} />
            </span>
          )}
        </div>
        {c.body === null ? (
          <p className="mt-1 text-sm italic text-muted">삭제된 댓글입니다.</p>
        ) : (
          <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed">{c.body}</p>
        )}
      </div>
    </article>
  );
}
