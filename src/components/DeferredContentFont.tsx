"use client";

import { useEffect } from "react";

/**
 * Content-delta Pretendard (~67 KB) covers body / glossary glyphs outside the critical
 * face. Keep it off the first-paint path: layout only ships critical (~137 KB). When
 * `.prose-article` mounts or nears the viewport, load pretendard-content.css so missing
 * body glyphs swap from the system stack (font-display: swap) with minimal shift.
 */
export function DeferredContentFont() {
  useEffect(() => {
    let cancelled = false;
    let io: IntersectionObserver | null = null;
    const seen = new WeakSet<Element>();

    async function activate() {
      if (cancelled || document.documentElement.dataset.contentFontReady === "1") return;
      document.documentElement.dataset.contentFontReady = "1";
      await import("@/app/pretendard-content.css");
    }

    function watch(el: Element) {
      if (seen.has(el)) return;
      seen.add(el);
      io ??= new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io?.disconnect();
            mo.disconnect();
            void activate();
          }
        },
        // Start slightly before prose enters view so streamed body glyphs swap soon.
        { rootMargin: "200px 0px" },
      );
      io.observe(el);
    }

    function scan() {
      document.querySelectorAll(".prose-article").forEach(watch);
    }

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      io?.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
