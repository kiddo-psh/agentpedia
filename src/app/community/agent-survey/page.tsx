import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SurveyCommentForm, SurveyComments, SurveyCommentsFallback } from "@/components/survey/SurveyComments";
import { SurveyForm } from "@/components/survey/SurveyForm";
import { SurveyResults, SurveyResultsFallback } from "@/components/survey/SurveyResults";
import { MAX_COMMENT_LENGTH, MAX_NICKNAME_LENGTH, PUBLISH_AT } from "@/survey/limits";
import { SURVEY_POST, SURVEY_POST_PUBLISHED_AT } from "@/survey/post";

export const metadata: Metadata = {
  title: SURVEY_POST.title,
  description: SURVEY_POST.summary,
};

const timeFormat = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeZone: "Asia/Seoul",
});

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function SurveyStatus({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const thanks = first(query.thanks);
  const survey = first(query.survey);
  if (thanks === "1") return <p>응답을 기록했습니다. {PUBLISH_AT}명이 모이면 이 글에 비율이 공개됩니다.</p>;
  if (survey === "already") return <p>이미 이 브라우저에서 응답했습니다.</p>;
  if (survey === "invalid") return <p>답을 다시 확인해 주세요. 기타를 골랐다면 내용을 적어 주세요.</p>;
  return <p>로그인 없이, 이 브라우저에서 한 번만 답합니다.</p>;
}

async function CommentStatus({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const comment = first((await searchParams).comment);
  if (comment === "ok") return <p>댓글을 남겼습니다.</p>;
  if (comment === "reported") return <p>신고를 받았습니다.</p>;
  if (comment === "link") return <p>댓글에는 링크를 넣을 수 없습니다.</p>;
  if (comment === "rate") return <p>잠시 후 다시 시도해 주세요.</p>;
  if (comment === "long") return <p>댓글은 {MAX_COMMENT_LENGTH}자까지 쓸 수 있습니다.</p>;
  if (comment === "nickname") return <p>이름은 {MAX_NICKNAME_LENGTH}자까지 쓸 수 있습니다.</p>;
  if (comment === "invalid") return <p>댓글을 다시 확인해 주세요.</p>;
  return <p>링크 없이 짧게 남겨 주세요.</p>;
}

export default function SurveyPostPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-5 pt-2 text-sm text-muted" aria-label="위치">
        <Link href="/community" className="hover:text-foreground">
          커뮤니티
        </Link>
        <span className="mx-1.5" aria-hidden>
          ›
        </span>
        <span className="text-foreground">설문</span>
      </nav>

      <article>
        <header>
          <h1 className="text-3xl leading-tight font-medium tracking-[-0.03em] sm:text-4xl">{SURVEY_POST.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <span className="font-medium text-foreground">{SURVEY_POST.authorName}</span>
            <time dateTime={SURVEY_POST_PUBLISHED_AT.toISOString()}>{timeFormat.format(SURVEY_POST_PUBLISHED_AT)}</time>
          </p>
        </header>

        <div className="mt-6 max-w-[40em] text-[1.05rem] leading-relaxed">
          <p>
            Agentpedia를 여는 분들이 어떤 에이전트와 모델을 쓰는지 모읍니다. 문항은 네 개고, 1분이면 됩니다.
            로그인은 필요 없습니다. 이 브라우저에서 한 번만 답할 수 있습니다.
          </p>
          <p className="mt-3">
            {PUBLISH_AT}명이 모이면 비율을 이 글에 공개합니다. 그 전에는 응답한 사람 수만 보여 줍니다. 고른 이유는
            댓글로 남겨 주세요.
          </p>
        </div>

        <div className="mt-6 min-h-12 text-sm text-muted">
          <Suspense fallback={<p>로그인 없이, 이 브라우저에서 한 번만 답합니다.</p>}>
            <SurveyStatus searchParams={searchParams} />
          </Suspense>
        </div>
        <SurveyForm />
      </article>

      <Suspense fallback={<SurveyResultsFallback />}>
        <SurveyResults />
      </Suspense>

      <section id="comments" className="mt-14 scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight">댓글</h2>
        <p className="mt-1 text-sm text-muted">로그인하지 않아도 됩니다. 이름은 비워 두면 익명으로 남습니다.</p>
        <div className="mt-3 min-h-6 text-sm text-muted">
          <Suspense fallback={<p>링크 없이 짧게 남겨 주세요.</p>}>
            <CommentStatus searchParams={searchParams} />
          </Suspense>
        </div>
        <SurveyCommentForm />
        <Suspense fallback={<SurveyCommentsFallback />}>
          <SurveyComments />
        </Suspense>
      </section>
    </div>
  );
}
