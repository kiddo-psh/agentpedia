"use client";

import { useEffect, useState } from "react";
import { MAX_CITATION_LENGTH } from "@/comments/limits";
import { dispatchCite } from "./cite";

type SelectionUi = { quote: string; top: number; left: number };

/**
 * When the reader selects text inside `.prose-article`, offer "인용해 댓글".
 * Fires `agentpedia:cite` and scrolls to #comments so CommentForm can attach the quote.
 */
export function CitationSelect() {
  const [ui, setUi] = useState<SelectionUi | null>(null);

  useEffect(() => {
    function clear() {
      setUi(null);
    }

    function onMouseUp() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        clear();
        return;
      }
      const range = sel.getRangeAt(0);
      const node = range.commonAncestorContainer;
      const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
      if (!el?.closest(".prose-article")) {
        clear();
        return;
      }
      const quote = sel.toString().replace(/\r\n?/g, "\n").trim();
      if (!quote || quote.length > MAX_CITATION_LENGTH) {
        clear();
        return;
      }
      const rect = range.getBoundingClientRect();
      setUi({
        quote,
        top: Math.max(8, rect.top - 44),
        left: Math.min(Math.max(80, rect.left + rect.width / 2), window.innerWidth - 80),
      });
    }

    document.addEventListener("mouseup", onMouseUp);
    // Hide the chip on scroll; selection geometry is viewport-relative (`fixed`).
    document.addEventListener("scroll", clear, true);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("scroll", clear, true);
    };
  }, []);

  if (!ui) return null;

  return (
    <button
      type="button"
      className="fixed z-30 -translate-x-1/2 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-sm hover:opacity-90"
      style={{ top: ui.top, left: ui.left }}
      onMouseDown={(e) => {
        // Keep the selection until we read it; prevent focus steal clearing it early.
        e.preventDefault();
      }}
      onClick={() => {
        dispatchCite(ui.quote);
        setUi(null);
        window.getSelection()?.removeAllRanges();
        document.getElementById("comments")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      인용해 댓글
    </button>
  );
}
