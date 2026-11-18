"use client";

import { useCallback, useState } from "react";
import { removeCommunityComment } from "@/community/actions";
import { PostCommentForm } from "./PostCommentForm";

export function PostReplyBox({ postId, parentId }: { postId: string; parentId: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return open ? (
    <div className="mt-3">
      <PostCommentForm
        postId={postId}
        parentId={parentId}
        placeholder="답글을 입력하세요"
        onDone={close}
      />
      <button type="button" onClick={close} className="mt-1 text-xs text-muted hover:text-foreground">
        취소
      </button>
    </div>
  ) : (
    <button type="button" onClick={() => setOpen(true)} className="text-xs text-muted hover:text-foreground">
      답글
    </button>
  );
}

export function PostDeleteCommentButton({ id }: { id: string }) {
  return (
    <form
      action={removeCommunityComment}
      onSubmit={(e) => {
        if (!confirm("댓글을 삭제할까요?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="text-xs text-muted hover:text-red-600">삭제</button>
    </form>
  );
}
