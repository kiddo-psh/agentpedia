"use client";

import { useSyncExternalStore } from "react";
import { monthsBetween, sourceAge } from "@/content/labels";

const STALE_AFTER_MONTHS = 6;

const subscribe = () => () => {};
const getNow = () => Date.now();
const getServerNow = () => null;

/**
 * "N개월 전" for the newest source. It depends on today's date, so it is computed in the
 * browser; the static page never bakes in the build date.
 */
export function SourceAge({ newestIso }: { newestIso: string }) {
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);
  if (now === null) return null;
  const months = monthsBetween(new Date(newestIso), new Date(now));
  const stale = months >= STALE_AFTER_MONTHS;
  return (
    <>
      <span aria-hidden>·</span>
      <span
        className={stale ? "rounded bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-700 dark:text-amber-300" : undefined}
        title={stale ? "AI 도구와 모델은 빠르게 바뀌므로 지금과 다를 수 있어요." : undefined}
      >
        {sourceAge(months)}
      </span>
    </>
  );
}
