import type { ReactNode } from "react";

export function KeyIdea({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="not-prose my-10 rounded-2xl bg-soft p-6 sm:p-7">
      <p className="mb-2 text-[13px] font-medium text-muted">핵심 아이디어</p>
      {title && <p className="mb-3 text-[22px] leading-snug font-semibold tracking-tight">{title}</p>}
      <div className="prose-article text-[1.0625rem] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{children}</div>
    </aside>
  );
}
