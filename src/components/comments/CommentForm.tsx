"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { postComment, type FormState } from "@/comments/actions";
import { MAX_COMMENT_LENGTH } from "@/comments/limits";
import { CITE_EVENT, type CiteDetail } from "./cite";

export function CommentForm({
  slug,
  parentId,
  placeholder = "이 글에 대한 생각을 나눠 주세요",
  onDone,
}: {
  slug: string;
  parentId?: string;
  placeholder?: string;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(postComment, {});

  useEffect(() => {
    if (state.savedAt) onDone?.();
  }, [state.savedAt, onDone]);

  // Remount fields after a successful save so the citation chip and textarea clear without setState-in-effect.
  return (
    <CommentFormFields
      key={state.savedAt ?? 0}
      slug={slug}
      parentId={parentId}
      placeholder={placeholder}
      state={state}
      action={action}
      pending={pending}
    />
  );
}

function CommentFormFields({
  slug,
  parentId,
  placeholder,
  state,
  action,
  pending,
}: {
  slug: string;
  parentId?: string;
  placeholder: string;
  state: FormState;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [citationQuote, setCitationQuote] = useState<string | null>(null);

  useEffect(() => {
    if (parentId) return;
    function onCite(e: Event) {
      const detail = (e as CustomEvent<CiteDetail>).detail;
      if (detail?.quote) setCitationQuote(detail.quote);
    }
    window.addEventListener(CITE_EVENT, onCite);
    return () => window.removeEventListener(CITE_EVENT, onCite);
  }, [parentId]);

  return (
    <form ref={form} action={action} className="grid gap-2">
      <input type="hidden" name="slug" value={slug} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      {!parentId && citationQuote && (
        <>
          <input type="hidden" name="citationQuote" value={citationQuote} />
          <div className="flex items-start gap-2 rounded-xl border border-line bg-soft/80 px-3 py-2 text-sm">
            <blockquote className="min-w-0 flex-1 border-l-2 border-foreground/25 pl-3 text-muted whitespace-pre-wrap break-words">
              {citationQuote}
            </blockquote>
            <button
              type="button"
              onClick={() => setCitationQuote(null)}
              className="shrink-0 text-xs text-muted hover:text-foreground"
            >
              인용 취소
            </button>
          </div>
        </>
      )}
      <textarea
        name="body"
        required
        maxLength={MAX_COMMENT_LENGTH}
        rows={parentId ? 2 : 3}
        placeholder={placeholder}
        className="w-full resize-y rounded-xl bg-soft px-4 py-3 text-[0.95rem] leading-relaxed outline-none focus:ring-2 focus:ring-foreground/20"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
        <button
          disabled={pending}
          className="inline-flex h-9 shrink-0 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "등록 중…" : parentId ? "답글 달기" : "댓글 달기"}
        </button>
      </div>
    </form>
  );
}
