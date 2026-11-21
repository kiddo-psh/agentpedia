import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import { TASK_LABEL, type TaskOption } from "@/reviews/labels";
import { listOperatorUserIds } from "@/reviews/operators";
import { voteReviewHelpful } from "@/reviews/actions";
import { listAgentReviews, type ReviewView } from "@/reviews/service";
import { DeleteReviewButton } from "./DeleteReviewButton";
import { ReviewForm } from "./ReviewForm";

const timeFormat = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

const percent = new Intl.NumberFormat("ko-KR", { style: "percent", maximumFractionDigits: 0 });

export async function AgentReviews({ slug }: { slug: string }) {
  await connection();
  const requestHeaders = await headers();
  let session: Awaited<ReturnType<typeof getSession>>;
  let page: Awaited<ReturnType<typeof listAgentReviews>>;
  let operators: Set<string>;
  try {
    const [sessionResult, db] = await Promise.all([getSession(requestHeaders), getDb()]);
    session = sessionResult;
    page = await listAgentReviews(db, slug, session?.user.id);
    operators = await listOperatorUserIds(db);
  } catch (err) {
    console.error(`[reviews] failed to load for ${slug}`, err);
    return (
      <p className="mt-4 rounded-xl bg-soft px-5 py-4 text-sm text-muted">
        지금은 리뷰를 불러올 수 없습니다. 페이지의 다른 내용은 그대로 읽을 수 있습니다.
      </p>
    );
  }
  return <ReviewBody slug={slug} page={page} me={session?.user.id} operators={operators} />;
}

function ReviewBody({
  slug,
  page,
  me,
  operators,
}: {
  slug: string;
  page: Awaited<ReturnType<typeof listAgentReviews>>;
  me?: string;
  operators: Set<string>;
}) {
  const { summary, reviews } = page;
  const login = `/login?next=${encodeURIComponent(`/agents/${slug}#reviews`)}`;

  return (
    <>
      <dl className="mt-4 grid gap-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">평균 별점</dt>
          <dd className="mt-1 font-medium">
            {summary.averageRating === null ? "없음" : `${summary.averageRating.toFixed(1)} · ${summary.count}개`}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">다시 쓸 의향</dt>
          <dd className="mt-1 font-medium">{summary.wouldUseAgain === null ? "없음" : percent.format(summary.wouldUseAgain)}</dd>
        </div>
      </dl>

      <h3 className="mt-8 text-lg font-medium">작업 유형</h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {summary.tasks.map((cell) => (
          <li
            key={cell.taskType}
            className={`flex items-baseline justify-between gap-3 rounded-xl px-3 py-2 text-sm ${cell.enough ? "bg-soft" : "text-muted"}`}
          >
            <span>{TASK_LABEL[cell.taskType]}</span>
            {cell.enough ? (
              <span className="tabular-nums font-medium">{cell.averageRating?.toFixed(1)}</span>
            ) : (
              <span>표본 부족{cell.count > 0 ? ` · ${cell.count}` : ""}</span>
            )}
          </li>
        ))}
      </ul>

      <h3 className="mt-8 text-lg font-medium">많이 적힌 스택</h3>
      {summary.topStacks.length === 0 ? (
        <p className="mt-2 text-sm text-muted">없음</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {summary.topStacks.map((stack) => (
            <li key={stack.tag} className="rounded-full bg-soft px-3 py-1 text-sm">
              {stack.tag} <span className="text-muted">{stack.count}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        {me ? (
          <ReviewForm slug={slug} />
        ) : (
          <p className="rounded-xl bg-soft px-5 py-4 text-sm text-muted">
            <Link href={login} className="font-medium text-foreground underline underline-offset-4">
              로그인
            </Link>
            하고 리뷰를 남기세요. 프로덕션에서는 GitHub 계정으로 로그인합니다.
          </p>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="mt-8 text-sm text-muted">아직 리뷰가 없습니다.</p>
      ) : (
        <ul className="mt-8 grid gap-8">
          {reviews.map((review) => (
            <li key={review.id}>
              <ReviewCard review={review} me={me} operator={operators.has(review.authorId)} login={login} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ReviewCard({
  review,
  me,
  operator,
  login,
}: {
  review: ReviewView;
  me?: string;
  operator: boolean;
  login: string;
}) {
  return (
    <article>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {review.authorImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar URLs come from arbitrary OAuth hosts
          <img src={review.authorImage} alt="" className="size-8 shrink-0 rounded-full" />
        ) : (
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-soft text-sm font-semibold">
            {review.authorName.slice(0, 1)}
          </span>
        )}
        <span className="font-semibold">{review.authorName}</span>
        {operator ? (
          <span className="rounded bg-soft px-1.5 py-0.5 text-xs font-medium">운영자</span>
        ) : null}
        <time className="text-xs text-muted" dateTime={review.createdAt.toISOString()}>
          {timeFormat.format(review.createdAt)}
        </time>
        {review.authorId === me ? (
          <span className="ml-auto">
            <DeleteReviewButton id={review.id} />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted">
        {TASK_LABEL[review.taskType as TaskOption]} · {review.rating}/5 · 다시 사용 {review.wouldUseAgain ? "예" : "아니오"}
        {review.model ? ` · ${review.model}` : ""}
        {review.usedSince ? ` · ${review.usedSince}부터` : ""}
      </p>
      {review.stack.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {review.stack.map((tag) => (
            <li key={tag} className="rounded-full bg-soft px-2 py-0.5 text-xs">
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{review.body}</p>
      <div className="mt-2">
        {me ? (
          <form action={voteReviewHelpful}>
            <input type="hidden" name="reviewId" value={review.id} />
            <input type="hidden" name="helpful" value={review.helpfulByMe ? "0" : "1"} />
            <button className="text-sm text-muted hover:text-foreground">
              도움됨 {review.helpfulCount}
              {review.helpfulByMe ? " · 누름" : ""}
            </button>
          </form>
        ) : (
          <Link href={login} className="text-sm text-muted hover:text-foreground">
            도움됨 {review.helpfulCount}
          </Link>
        )}
      </div>
    </article>
  );
}
