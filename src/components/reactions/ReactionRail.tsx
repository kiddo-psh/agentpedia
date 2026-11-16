import type { ReactNode } from "react";
import { ShareButton } from "@/components/ShareButton";
import { SuggestButton } from "./SuggestButton";

/**
 * Like, share and suggest, pinned to the right edge so they stay in reach at any point of the
 * article. Vertically centered on wider screens; at the bottom corner on phones, clear of the text.
 */
export function ReactionRail({
  slug,
  title,
  text,
  likes,
}: {
  slug: string;
  title: string;
  text: string;
  likes: ReactNode;
}) {
  return (
    <nav
      aria-label="이 글에 반응하기"
      className="fixed right-3 bottom-4 z-30 flex flex-col gap-2 sm:right-5 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
    >
      {likes}
      <ShareButton slug={slug} title={title} text={text} />
      <SuggestButton slug={slug} />
    </nav>
  );
}
