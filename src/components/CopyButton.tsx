"use client";

import { useState, type MouseEvent } from "react";
import { sendEvent, useArticleSlug } from "@/components/ArticleTracking";

const LOOK = {
  chip: "shrink-0 rounded-full bg-background px-3 py-1 text-xs font-medium ring-1 ring-line ring-inset hover:bg-soft",
  primary:
    "mt-3 flex h-10 w-full items-center justify-center rounded-full bg-foreground text-sm font-medium text-background hover:opacity-85",
  secondary:
    "mt-2 flex h-10 w-full items-center justify-center rounded-full text-sm font-medium ring-1 ring-line ring-inset hover:bg-soft",
} as const;

/** Inside an article page, a successful copy counts as a `web_copy` apply event. */
export function CopyButton({
  text,
  label = "복사",
  look = "chip",
}: {
  text: string;
  label?: string;
  look?: keyof typeof LOOK;
}) {
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
    <button type="button" onClick={copy} className={LOOK[look]}>
      {state === "copied" ? "복사됨 ✓" : state === "failed" ? "복사 실패" : label}
    </button>
  );
}
