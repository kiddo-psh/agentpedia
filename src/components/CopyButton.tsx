"use client";

import { useState, type MouseEvent } from "react";
import { sendEvent, useArticleSlug } from "@/components/ArticleTracking";

/** Inside an article page, a successful copy counts as a `web_copy` apply event. */
export function CopyButton({ text, label = "복사" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const slug = useArticleSlug();

  async function copy(e: MouseEvent<HTMLButtonElement>) {
    // Inside a <summary>, a click would also toggle the <details>.
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      if (slug) sendEvent(slug, "web_copy");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-md border border-foreground/15 bg-background px-2.5 py-1 text-xs font-medium hover:bg-foreground/5"
    >
      {state === "copied" ? "복사됨 ✓" : state === "failed" ? "복사 실패" : label}
    </button>
  );
}
