"use client";

import { removeReview } from "@/reviews/actions";

export function DeleteReviewButton({ id }: { id: string }) {
  return (
    <form
      action={removeReview}
      onSubmit={(event) => {
        if (!confirm("리뷰를 삭제할까요?")) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="text-xs text-muted hover:text-red-600">삭제</button>
    </form>
  );
}
