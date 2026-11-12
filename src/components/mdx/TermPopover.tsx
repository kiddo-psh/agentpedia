"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import type { GlossaryEntry } from "@/content/schema";
import { termAnchor } from "./termAnchor";

const GAP = 6;
const MARGIN = 16;
const SHEET_QUERY = "(max-width: 639px)";

/**
 * Inline term that opens its definition in a native popover: below the word on wide screens,
 * as a bottom sheet on phones. The Popover API handles light dismiss, Esc and the top layer.
 */
export function TermPopover({ entry, children }: { entry: GlossaryEntry; children: ReactNode }) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = card.current!;
    const close = () => el.hidePopover();

    function onBeforeToggle(e: Event) {
      if ((e as ToggleEvent).newState !== "open") return;
      if (window.matchMedia(SHEET_QUERY).matches) {
        el.style.left = el.style.top = "";
        return;
      }
      // Hidden cards have no size yet; onToggle clamps and flips once the card is laid out.
      const b = button.current!.getBoundingClientRect();
      el.style.left = `${b.left}px`;
      el.style.top = `${b.bottom + GAP}px`;
    }

    // The card is fixed, so it would drift from its word on scroll; a flip upward needs its height.
    function onToggle(e: Event) {
      if ((e as ToggleEvent).newState !== "open") {
        window.removeEventListener("scroll", close, true);
        return;
      }
      window.addEventListener("scroll", close, { capture: true, passive: true, once: true });
      if (window.matchMedia(SHEET_QUERY).matches) return;
      const b = button.current!.getBoundingClientRect();
      const left = Math.max(MARGIN, Math.min(b.left, window.innerWidth - el.offsetWidth - MARGIN));
      el.style.left = `${left}px`;
      if (b.bottom + GAP + el.offsetHeight > window.innerHeight - MARGIN) {
        el.style.top = `${b.top - GAP - el.offsetHeight}px`;
      }
    }

    el.addEventListener("beforetoggle", onBeforeToggle);
    el.addEventListener("toggle", onToggle);
    return () => {
      el.removeEventListener("beforetoggle", onBeforeToggle);
      el.removeEventListener("toggle", onToggle);
      window.removeEventListener("scroll", close, true);
    };
  }, []);

  return (
    <>
      <button
        ref={button}
        type="button"
        popoverTarget={id}
        className="cursor-help text-left underline decoration-accent/60 decoration-dotted underline-offset-4 hover:decoration-accent"
      >
        {children}
      </button>
      {/* Spans only: a term sits inside a <p>, where a <div> is invalid HTML. */}
      <span
        ref={card}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={entry.term}
        className="inset-auto m-0 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-foreground/15 bg-background p-4 text-sm text-foreground shadow-lg max-sm:inset-x-0 max-sm:top-auto max-sm:bottom-0 max-sm:w-full max-sm:rounded-b-none max-sm:p-5"
      >
        <span className="block font-semibold">
          {entry.term}
          {entry.en && <span className="ml-1.5 font-normal text-muted">{entry.en}</span>}
        </span>
        <span className="mt-1 block leading-relaxed text-muted">{entry.definition}</span>
        <a
          href={`#${termAnchor(entry.id)}`}
          onClick={() => card.current?.hidePopover()}
          className="mt-2 inline-block text-xs text-accent underline underline-offset-2"
        >
          이 글의 용어 목록에서 보기
        </a>
      </span>
    </>
  );
}
