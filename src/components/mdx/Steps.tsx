"use client";

import type { MouseEvent, ReactNode } from "react";

/** Wraps a markdown ordered list; clicking a step toggles it done. */
export function Steps({ children }: { children: ReactNode }) {
  function toggle(e: MouseEvent<HTMLDivElement>) {
    const li = (e.target as HTMLElement).closest("li");
    if (!li || !e.currentTarget.contains(li)) return;
    li.toggleAttribute("data-done");
  }

  return (
    <div className="steps not-prose my-8" onClick={toggle}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
        단계별로 따라하기 · 완료한 단계를 눌러 체크하세요
      </p>
      {children}
    </div>
  );
}
