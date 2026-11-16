"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendSuggestion, type SuggestState } from "@/suggestions/actions";
import { MAX_SUGGESTION_LENGTH } from "@/suggestions/limits";
import { railButton } from "./railButton";

/** Opens a small dialog; anyone can send, signed in or not. */
export function SuggestButton({ slug }: { slug: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<SuggestState, FormData>(sendSuggestion, {});

  // The thank-you shows once per send; reopening the dialog brings the form back.
  const [acknowledged, setAcknowledged] = useState<number | undefined>();
  const justSent = state.sentAt !== undefined && state.sentAt !== acknowledged;

  useEffect(() => {
    if (state.sentAt) form.current?.reset();
  }, [state.sentAt]);

  function open() {
    setAcknowledged(state.sentAt);
    dialog.current?.showModal();
  }

  return (
    <>
      <button type="button" className={railButton} onClick={open} title="이 글에 건의하기">
        <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden fill="none" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 5h16v11H9l-5 4V5zM8 9.5h8M8 12.5h5"
          />
        </svg>
        <span>건의</span>
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="suggest-title"
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl bg-background p-6 text-foreground ring-1 ring-line backdrop:bg-black/40"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <h2 id="suggest-title" className="text-lg font-semibold">
          이 글에 건의하기
        </h2>
        {justSent ? (
          <div className="mt-3">
            <p aria-live="polite">고맙습니다. 건의를 받았습니다.</p>
            <button
              type="button"
              className="mt-5 h-10 rounded-full bg-foreground px-5 text-sm text-background"
              onClick={() => dialog.current?.close()}
            >
              닫기
            </button>
          </div>
        ) : (
          <form ref={form} action={action} className="mt-3">
            <p className="text-sm text-muted">틀린 사실, 빠진 출처, 키트가 동작하지 않은 경험, 다뤄 줬으면 하는 주제를 적어 주세요. 로그인하지 않아도 됩니다.</p>
            <input type="hidden" name="slug" value={slug} />
            <textarea
              name="body"
              required
              rows={5}
              maxLength={MAX_SUGGESTION_LENGTH}
              aria-label="건의 내용"
              className="mt-4 w-full resize-y rounded-xl bg-soft p-3 text-[15px] leading-relaxed outline-none focus:ring-2 focus:ring-foreground/30"
            />
            {state.error && (
              <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-400">
                {state.error}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="h-10 rounded-full px-5 text-sm ring-1 ring-line ring-inset hover:bg-soft" onClick={() => dialog.current?.close()}>
                취소
              </button>
              <button type="submit" disabled={pending} className="h-10 rounded-full bg-foreground px-5 text-sm text-background disabled:opacity-60">
                {pending ? "보내는 중…" : "보내기"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
