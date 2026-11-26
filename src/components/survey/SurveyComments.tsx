import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { headers } from "next/headers";
import { canViewMetrics } from "@/admin/metrics";
import { Honeypot } from "@/components/survey/Honeypot";
import { listSurveyComments, type SurveyCommentView, type SurveyThread } from "@/survey/comments";
import { getDb } from "@/db/client";
import { MAX_COMMENT_LENGTH, MAX_NICKNAME_LENGTH } from "@/survey/limits";

const timeFormat = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export function SurveyCommentsFallback() {
  return (
    <div className="mt-6">
      <p className="text-sm text-muted">댓글을 불러오는 중…</p>
    </div>
  );
}

function CommentFields({ parentId, label }: { parentId?: string; label: string }) {
  return (
    <>
      <Honeypot />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <input
        type="text"
        name="nickname"
        maxLength={MAX_NICKNAME_LENGTH}
        placeholder="이름 (선택, 비우면 익명)"
        aria-label="이름"
        autoComplete="nickname"
        className="w-full max-w-xs rounded-xl bg-soft px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
      />
      <textarea
        name="body"
        required
        rows={parentId ? 2 : 3}
        maxLength={MAX_COMMENT_LENGTH}
        placeholder={parentId ? "답글을 적어 주세요. 링크는 남길 수 없습니다." : "고른 이유나 궁금한 점을 적어 주세요. 링크는 남길 수 없습니다."}
        aria-label={parentId ? "답글" : "댓글"}
        className="w-full resize-y rounded-xl bg-soft px-4 py-3 text-[0.95rem] leading-relaxed outline-none focus:ring-2 focus:ring-foreground/20"
      />
      <div>
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background hover:opacity-85"
        >
          {label}
        </button>
      </div>
    </>
  );
}

function CommentForm() {
  return (
    <form action="/api/survey/comments" method="post" className="mt-4 grid gap-2">
      <CommentFields label="댓글 달기" />
    </form>
  );
}

function ReplyForm({ parentId }: { parentId: string }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs text-muted">답글</summary>
      <form action="/api/survey/comments" method="post" className="mt-2 grid gap-2">
        <CommentFields parentId={parentId} label="답글 달기" />
      </form>
    </details>
  );
}

function CommentBody({ comment, admin, replyTo }: { comment: SurveyCommentView; admin: boolean; replyTo?: boolean }) {
  return (
    <article className="border-t border-line py-4">
      {comment.placeholder ? (
        <p className="text-sm text-muted">숨겨진 댓글입니다</p>
      ) : (
        <>
          <header className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-medium">{comment.nickname}</span>
            <time className="text-muted" dateTime={comment.createdAt.toISOString()}>
              {timeFormat.format(comment.createdAt)}
            </time>
            {comment.hidden && <span className="text-xs text-muted">숨김</span>}
          </header>
          <p className="mt-2 whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed">{comment.body}</p>
        </>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {!comment.hidden && !comment.placeholder && (
          <form action="/api/survey/comments/report" method="post">
            <Honeypot />
            <input type="hidden" name="id" value={comment.id} />
            <button type="submit" className="text-xs text-muted underline-offset-4 hover:underline">
              신고
            </button>
          </form>
        )}
        {admin && (
          <>
            {!comment.hidden && (
              <form action="/api/survey/comments/moderate" method="post">
                <input type="hidden" name="id" value={comment.id} />
                <input type="hidden" name="op" value="hide" />
                <button type="submit" className="text-xs text-muted underline-offset-4 hover:underline">
                  숨기기
                </button>
              </form>
            )}
            <form action="/api/survey/comments/moderate" method="post">
              <input type="hidden" name="id" value={comment.id} />
              <input type="hidden" name="op" value="delete" />
              <button type="submit" className="text-xs text-muted underline-offset-4 hover:underline">
                삭제
              </button>
            </form>
          </>
        )}
      </div>
      {replyTo ? <ReplyForm parentId={comment.id} /> : null}
    </article>
  );
}

function Thread({ thread, admin }: { thread: SurveyThread; admin: boolean }) {
  return (
    <div>
      <CommentBody comment={thread} admin={admin} replyTo />
      {thread.replies.length > 0 && (
        <div className="ml-6 border-l border-line pl-4">
          {thread.replies.map((reply) => (
            <CommentBody key={reply.id} comment={reply} admin={admin} />
          ))}
        </div>
      )}
    </div>
  );
}

export async function SurveyComments() {
  await connection();
  let comments: SurveyThread[] | null = null;
  let admin = false;
  try {
    const requestHeaders = await headers();
    const db = await getDb();
    admin = await canViewMetrics(requestHeaders).catch(() => false);
    comments = await listSurveyComments(db, { includeHidden: admin });
  } catch (err) {
    unstable_rethrow(err);
    console.error("[survey] failed to load comments", err);
  }
  if (!comments) return <p className="mt-6 text-sm text-muted">지금은 댓글을 불러올 수 없습니다.</p>;
  if (comments.length === 0) return <p className="mt-6 text-sm text-muted">아직 댓글이 없습니다.</p>;
  return (
    <div className="mt-6">
      {comments.map((thread) => (
        <Thread key={thread.id} thread={thread} admin={admin} />
      ))}
    </div>
  );
}

export function SurveyCommentForm() {
  return <CommentForm />;
}
