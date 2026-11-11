"use client";

import { useCallback, useState } from "react";
import { removeComment } from "@/comments/actions";
import { CommentForm } from "./CommentForm";

export function ReplyBox({ slug, parentId }: { slug: string; parentId: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return open ? (
    <div className="mt-3">
      <CommentForm slug={slug} parentId={parentId} placeholder="답글을 입력하세요" onDone={close} />
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

export function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={removeComment}
      onSubmit={(e) => {
        if (!confirm("댓글을 삭제할까요?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="text-xs text-muted hover:text-red-600">삭제</button>
    </form>
  );
}
