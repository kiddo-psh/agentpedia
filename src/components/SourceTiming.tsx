"use client";

import { useSyncExternalStore } from "react";
import { monthsBetween } from "@/content/labels";

const STALE_AFTER_MONTHS = 6;

const subscribe = () => () => {};
const getNow = () => Date.now();
const getServerNow = () => null;

/**
 * "As of" line plus a staleness notice. The notice depends on today's date, so it is
 * computed in the browser; the static page never bakes in the build date.
 */
export function SourceTiming({ period, newestIso }: { period: string; newestIso: string }) {
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);
  const months = now === null ? 0 : monthsBetween(new Date(newestIso), new Date(now));

  return (
    <div className="mt-4 text-sm">
      <p className="text-muted">
        <span className="font-medium text-foreground">출처 시점</span> {period}
      </p>
      {months >= STALE_AFTER_MONTHS && (
        <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-amber-700 dark:text-amber-300">
          가장 최근 출처가 {months}개월 전 자료입니다. AI 도구와 모델은 빠르게 바뀌므로 지금과 다를 수 있어요.
        </p>
      )}
    </div>
  );
}
