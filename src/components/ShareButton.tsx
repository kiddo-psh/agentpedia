"use client";

import { useState } from "react";
import { sendEvent } from "@/components/ArticleTracking";

/** The system share sheet where the browser has one (mostly mobile), otherwise copies the link. */
export function ShareButton({ slug, title, text }: { slug: string; title: string; text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function share() {
    const url = `${location.origin}/a/${slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        sendEvent(slug, "share");
      } catch {
        // AbortError means the reader closed the sheet; nothing was shared.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
      sendEvent(slug, "share");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1500);
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-md border border-foreground/15 px-2.5 py-1 text-sm hover:bg-foreground/5"
    >
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </svg>
      <span aria-live="polite">{state === "copied" ? "링크 복사됨 ✓" : state === "failed" ? "복사 실패" : "공유"}</span>
    </button>
  );
}
