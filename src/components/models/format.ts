/** Display helpers for model leaderboard numbers. Never invent values. */

/** Unchecked cell. The table legend says what the dash means. */
export const EMPTY = "—";

/**
 * A model blurb that only restates the vendor and the Terminal-Bench harness
 * already shown in the table. Unique sentences (pricing, and so on) stay.
 */
export function isRedundantModelBody(markdown: string): boolean {
  const text = markdown.replace(/\s+/g, " ").trim();
  if (!text) return true;
  if (/청구|하위 모델|고정 목록가/.test(text)) return false;
  const parts = text.split(/(?<=다\.)\s*/).filter(Boolean);
  if (parts.length > 2) return false;
  return parts.every((part) => /모델입니다\.$|하네스로 잰 값입니다\.$|잰 값이 있습니다\.$/.test(part));
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function formatUsd(value: number): string {
  return money.format(value);
}

export function formatPercent(value: number, margin?: number): string {
  const base = `${value}%`;
  return margin !== undefined ? `${base} ± ${margin}` : base;
}

export function formatTokensBillions(value: number): string {
  return `${value}B`;
}
