"use client";

import { removeCommunityPost } from "@/community/actions";

export function DeletePostButton({ id }: { id: string }) {
  return (
    <form
      action={removeCommunityPost}
      onSubmit={(e) => {
        if (!confirm("글을 삭제할까요?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="text-xs text-muted hover:text-red-600">삭제</button>
    </form>
  );
}
