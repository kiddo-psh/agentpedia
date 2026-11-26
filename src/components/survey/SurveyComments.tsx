import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { headers } from "next/headers";
import { canViewMetrics } from "@/admin/metrics";
import { Honeypot } from "@/components/survey/Honeypot";
import { listSurveyComments, type SurveyCommentView } from "@/survey/comments";
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

function CommentForm() {
  return (
    <form action="/api/survey/comments" method="post" className="mt-4 grid gap-2">
      <Honeypot />
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
        rows={3}
        maxLength={MAX_COMMENT_LENGTH}
        placeholder="고른 이유나 궁금한 점을 적어 주세요. 링크는 남길 수 없습니다."
        aria-label="댓글"
        className="w-full resize-y rounded-xl bg-soft px-4 py-3 text-[0.95rem] leading-relaxed outline-none focus:ring-2 focus:ring-foreground/20"
      />
      <div>
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background hover:opacity-85"
        >
          댓글 달기
        </button>
      </div>
    </form>
  );
}

function CommentBody({ comment, admin }: { comment: SurveyCommentView; admin: boolean }) {
  return (
    <article className="border-t border-line py-4">
      <header className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-medium">{comment.nickname}</span>
        <time className="text-muted" dateTime={comment.createdAt.toISOString()}>
          {timeFormat.format(comment.createdAt)}
        </time>
        {comment.hidden && <span className="text-xs text-muted">숨김</span>}
      </header>
      <p className="mt-2 whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed">{comment.body}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {!comment.hidden && (
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
    </article>
  );
}

export async function SurveyComments() {
  await connection();
  let comments: SurveyCommentView[] | null = null;
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
      {comments.map((comment) => (
        <CommentBody key={comment.id} comment={comment} admin={admin} />
      ))}
    </div>
  );
}

export function SurveyCommentForm() {
  return <CommentForm />;
}
