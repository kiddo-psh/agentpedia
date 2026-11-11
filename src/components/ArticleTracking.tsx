"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

type ClientEventKind = "view" | "web_copy";

export function sendEvent(slug: string, kind: ClientEventKind) {
  const body = JSON.stringify({ slug, kind });
  // sendBeacon survives navigation; fall back to fetch where it is unavailable or refused.
  const queued = navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }));
  if (!queued) {
    void fetch("/api/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  }
}

const ArticleSlug = createContext<string | null>(null);

/** Slug of the article being read, or null outside an article page. */
export const useArticleSlug = () => useContext(ArticleSlug);

/** Records one view per mount and lets descendants (copy buttons) attribute events to the article. */
export function ArticleTracking({ slug, children }: { slug: string; children: ReactNode }) {
  useEffect(() => sendEvent(slug, "view"), [slug]);
  return <ArticleSlug.Provider value={slug}>{children}</ArticleSlug.Provider>;
}
