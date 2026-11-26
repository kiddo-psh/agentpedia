import Link from "next/link";
import { SURVEY_DISMISS_JS } from "@/survey/boot";
import { SURVEY_POST_PATH } from "@/survey/post";

/** Static home card. A head script hides it before paint when the visitor dismissed or answered. */
export function SurveyBanner() {
  return (
    <section aria-labelledby="survey-banner-title" className="survey-banner mt-16">
      <div className="flex min-h-[4.75rem] flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl bg-soft px-5 py-4">
        <div className="min-w-0">
          <h2 id="survey-banner-title" className="text-base font-semibold tracking-tight">
            1분 설문: 어떤 에이전트 쓰세요?
          </h2>
          <p className="mt-1 text-sm text-muted">에이전트, 모델, 용도, 사용 기간. 로그인 없이 답합니다.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={SURVEY_POST_PATH}
            prefetch={true}
            className="inline-flex h-10 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background hover:opacity-85"
          >
            답하기
          </Link>
          <button
            type="button"
            data-survey-dismiss
            className="inline-flex h-10 items-center rounded-full px-4 text-sm ring-1 ring-line ring-inset hover:bg-background"
          >
            닫기
          </button>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: SURVEY_DISMISS_JS }} />
    </section>
  );
}
