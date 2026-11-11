import type { ArticleMeta, Category } from "./schema";

export const CATEGORY_LABEL: Record<Category, string> = {
  people: "인물",
  trends: "트렌드",
  startup: "창업 사례",
  security: "보안",
};

export const DIFFICULTY_LABEL: Record<ArticleMeta["difficulty"], string> = {
  intro: "입문",
  practical: "실전",
  deep: "심화",
};

const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Seoul",
});

export const formatDate = (d: Date) => dateFormat.format(d);

const monthFormat = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", timeZone: "Asia/Seoul" });

/** "2025년 6월", or "2025년 12월 ~ 2026년 1월" when sources span months. */
export function sourcePeriod(sources: { publishedAt: Date; dateNote?: string }[]): string {
  const times = sources.map((s) => s.publishedAt.getTime());
  const [from, to] = [monthFormat.format(Math.min(...times)), monthFormat.format(Math.max(...times))];
  const estimated = sources.some((s) => s.dateNote) ? " (일부 추정)" : "";
  return (from === to ? from : `${from} ~ ${to}`) + estimated;
}

/** Whole months between two dates, floored. */
export function monthsBetween(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return to.getDate() < from.getDate() ? months - 1 : months;
}
