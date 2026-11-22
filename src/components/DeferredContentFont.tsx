"use client";

import { useEffect } from "react";

/**
 * Glyphs outside the first-screen face. Loaded after `window` `load` so the
 * request cannot join the LCP font chain. `font-display: swap` then fills
 * below-the-fold text that the shell face does not cover.
 */
export function DeferredContentFont() {
  useEffect(() => {
    let cancelled = false;

    async function activate() {
      if (cancelled || document.documentElement.dataset.contentFontReady === "1") return;
      document.documentElement.dataset.contentFontReady = "1";
      await import("@/app/pretendard-content.css");
    }

    if (document.readyState === "complete") {
      void activate();
      return () => {
        cancelled = true;
      };
    }
    window.addEventListener("load", () => void activate(), { once: true });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
