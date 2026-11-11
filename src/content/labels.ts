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

type Dated = { publishedAt?: Date; accessedAt?: Date; dateNote?: string };

/** Newest publication date; undated sources (accessedAt only) do not count. */
export function newestPublished(sources: Dated[]): Date {
  return new Date(Math.max(...sources.flatMap((s) => (s.publishedAt ? [s.publishedAt.getTime()] : []))));
}

/** "2025년 6월", or "2025년 12월 ~ 2026년 1월" when sources span months. Undated sources are ignored. */
export function sourcePeriod(sources: Dated[]): string {
  const dated = sources.filter((s): s is Dated & { publishedAt: Date } => Boolean(s.publishedAt));
  const times = dated.map((s) => s.publishedAt.getTime());
  const [from, to] = [monthFormat.format(Math.min(...times)), monthFormat.format(Math.max(...times))];
  const estimated = dated.some((s) => s.dateNote) ? " (일부 날짜 간접 확인)" : "";
  return (from === to ? from : `${from} ~ ${to}`) + estimated;
}

/** Whole months between two dates, floored. */
export function monthsBetween(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return to.getDate() < from.getDate() ? months - 1 : months;
}
