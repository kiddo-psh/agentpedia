"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { setArticleLike } from "@/likes/actions";
import type { LikeState } from "@/likes/service";

const buttonClass =
  "inline-flex items-center gap-1.5 rounded-md border border-foreground/15 px-2.5 py-1 text-sm hover:bg-foreground/5";

export function LikeToggle({ slug, initial, signedIn }: { slug: string; initial: LikeState; signedIn: boolean }) {
  const [state, setState] = useState(initial);
  const [optimistic, setOptimistic] = useOptimistic(state);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/a/${slug}`)}`}
        className={buttonClass}
        title="로그인하고 좋아요를 누르세요"
      >
        <Heart filled={false} />
        <span>{state.count}</span>
      </Link>
    );
  }

  function toggle() {
    const liked = !optimistic.liked;
    setError(null);
    startTransition(async () => {
      setOptimistic({ liked, count: optimistic.count + (liked ? 1 : -1) });
      const result = await setArticleLike(slug, liked);
      if ("error" in result) setError(result.error);
      else setState(result);
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={optimistic.liked}
        aria-label={optimistic.liked ? "좋아요 취소" : "좋아요"}
        className={`${buttonClass} ${optimistic.liked ? "border-rose-500/40 text-rose-600 dark:text-rose-400" : ""}`}
      >
        <Heart filled={optimistic.liked} />
        <span>{optimistic.count}</span>
      </button>
      {error && <span className="text-xs text-muted">{error}</span>}
    </span>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinejoin="round"
        d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.5 0 5.7 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"
      />
    </svg>
  );
}
