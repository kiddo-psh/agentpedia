"use client";

import { useActionState, useEffect, useRef } from "react";
import { postCommunityComment, type CommentFormState } from "@/community/actions";
import { MAX_COMMUNITY_COMMENT_LENGTH } from "@/community/limits";

export function PostCommentForm({
  postId,
  parentId,
  placeholder = "이 글에 대한 생각을 나눠 주세요",
  onDone,
}: {
  postId: string;
  parentId?: string;
  placeholder?: string;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<CommentFormState, FormData>(postCommunityComment, {});
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.savedAt) return;
    form.current?.reset();
    onDone?.();
  }, [state.savedAt, onDone]);

  return (
    <form ref={form} action={action} className="grid gap-2">
      <input type="hidden" name="postId" value={postId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <textarea
        name="body"
        required
        maxLength={MAX_COMMUNITY_COMMENT_LENGTH}
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
