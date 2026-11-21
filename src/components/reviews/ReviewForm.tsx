"use client";

import { useActionState } from "react";
import { postReview, type FormState } from "@/reviews/actions";
import { TASK_OPTIONS } from "@/reviews/labels";
import { MAX_REVIEW_BODY, MIN_REVIEW_BODY } from "@/reviews/limits";

export function ReviewForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(postReview, {});
  return (
    <ReviewFields key={state.savedAt ?? 0} slug={slug} state={state} action={action} pending={pending} />
  );
}

function ReviewFields({
  slug,
  state,
  action,
  pending,
}: {
  slug: string;
  state: FormState;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="agentSlug" value={slug} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-muted">작업</span>
          <select
            name="taskType"
            required
            className="h-10 rounded-xl bg-soft px-3 outline-none focus:ring-2 focus:ring-foreground/20"
            defaultValue="write_code"
          >
            {TASK_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted">별점</span>
          <select
            name="rating"
            required
            className="h-10 rounded-xl bg-soft px-3 outline-none focus:ring-2 focus:ring-foreground/20"
            defaultValue="5"
          >
            {[5, 4, 3, 2, 1].map((score) => (
              <option key={score} value={score}>
                {score}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="grid gap-1 text-sm">
        <legend className="text-muted">다시 쓸 의향</legend>
        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="wouldUseAgain" value="1" required />예
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="wouldUseAgain" value="0" required />
            아니오
          </label>
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-muted">모델 (선택)</span>
          <input
            name="model"
            maxLength={80}
            className="h-10 rounded-xl bg-soft px-3 outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted">사용 시작일 (선택)</span>
          <input
            name="usedSince"
            type="date"
            className="h-10 rounded-xl bg-soft px-3 outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        <span className="text-muted">스택 (선택, 쉼표로 구분)</span>
        <input
          name="stack"
          placeholder="TypeScript, Next.js"
          className="h-10 rounded-xl bg-soft px-3 outline-none focus:ring-2 focus:ring-foreground/20"
        />
      </label>
      <textarea
        name="body"
        required
        minLength={MIN_REVIEW_BODY}
        maxLength={MAX_REVIEW_BODY}
        rows={5}
        placeholder="어떤 작업에 썼고, 무엇이 됐고 무엇이 안 됐는지 적어 주세요."
        className="w-full resize-y rounded-xl bg-soft px-4 py-3 text-[0.95rem] leading-relaxed outline-none focus:ring-2 focus:ring-foreground/20"
      />
      <p className="text-xs text-muted">
        같은 작업은 한 번, 하루 5건까지. 본문 {MIN_REVIEW_BODY}자 이상, 링크 2개 이하.
      </p>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
        <button
          disabled={pending}
          className="inline-flex h-9 shrink-0 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "등록 중…" : "리뷰 남기기"}
        </button>
      </div>
    </form>
  );
}
