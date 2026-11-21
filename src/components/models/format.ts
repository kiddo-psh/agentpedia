/** Display helpers for model leaderboard numbers. Never invent values. */

export const EMPTY = "없음";

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

export function formatDuration(sec: number): string {
  const minutes = Math.floor(sec / 60);
  const seconds = Math.round(sec % 60);
  return `${minutes}분 ${String(seconds).padStart(2, "0")}초`;
}
