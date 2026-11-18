"use client";

import { useEffect } from "react";

/**
 * Geist Mono is only needed for kit / code / pre. Keep it off the first-paint
 * critical path: system mono renders until #kit or a code block nears the viewport.
 * The sticky ApplyRail `<pre>` is excluded so wide layouts do not fetch mono for the rail alone.
 */
export function DeferredMonoFont() {
  useEffect(() => {
    let cancelled = false;
    let io: IntersectionObserver | null = null;
    const seen = new WeakSet<Element>();

    async function activate() {
      if (cancelled || document.documentElement.dataset.monoReady === "1") return;
      document.documentElement.dataset.monoReady = "1";
      const { geistMono } = await import("@/app/fonts");
      document.documentElement.classList.add(geistMono.variable);
    }

    function watch(el: Element) {
      if (seen.has(el)) return;
      // Apply rail command stays on system mono; it is above-fold on xl.
      if (el.closest('[aria-label="이 글 적용하기"]')) return;
      seen.add(el);
      io ??= new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io?.disconnect();
            mo.disconnect();
            void activate();
          }
        },
        { rootMargin: "200px 0px" },
      );
      io.observe(el);
    }

    function scan() {
      document.querySelectorAll("#kit, pre, code").forEach(watch);
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
