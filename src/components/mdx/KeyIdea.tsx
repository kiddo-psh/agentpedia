import type { ReactNode } from "react";

export function KeyIdea({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="not-prose my-8 rounded-xl border border-accent/30 bg-accent/5 p-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">
        핵심 아이디어
      </p>
      {title && <p className="mb-3 text-lg font-semibold leading-snug">{title}</p>}
      <div className="prose-article text-[0.95rem] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {children}
      </div>
    </aside>
  );
}
