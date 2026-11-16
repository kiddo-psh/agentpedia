import { and, eq, inArray } from "drizzle-orm";
import { getDb, type Db } from "@/db/client";
import { account } from "@/db/schema";
import type { ArticleMetrics } from "@/events/metrics";
import { getSession } from "@/lib/auth";

export const METRICS_PERIODS = [7, 28, 90] as const;
export type MetricsPeriod = (typeof METRICS_PERIODS)[number];

/** `?days=` from the URL; anything other than a listed period falls back to 7. */
export function parsePeriod(value: string | string[] | undefined): MetricsPeriod {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return METRICS_PERIODS.find((p) => p === n) ?? 7;
}

/** GitHub numeric user ids from `METRICS_ADMINS` (comma-separated). Ids survive login renames. */
export function parseAdminIds(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * With `METRICS_ADMINS` set, only a user signed in with one of those GitHub accounts may see
 * metrics. Unset, metrics are open in development and closed in production, like /api/metrics.
 */
export async function isMetricsAdmin(
  db: Db,
  userId: string | undefined,
  adminIds = parseAdminIds(process.env.METRICS_ADMINS),
): Promise<boolean> {
  if (adminIds.length === 0) return process.env.NODE_ENV !== "production";
  if (!userId) return false;
  const rows = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(eq(account.userId, userId), eq(account.providerId, "github"), inArray(account.accountId, adminIds)),
    )
    .limit(1);
  return rows.length > 0;
}

export async function canViewMetrics(headers: Headers): Promise<boolean> {
  const session = await getSession(headers);
  return isMetricsAdmin(await getDb(), session?.user.id);
}

export type MetricsTotals = Omit<ArticleMetrics, "articleSlug">;

/** Sums per-article visitor-days, so one visitor reading two articles counts twice. */
export function totalMetrics(rows: ArticleMetrics[]): MetricsTotals {
  const sum = (key: "viewers" | "webAppliers" | "mcpCalls" | "mcpClients") =>
    rows.reduce((n, r) => n + r[key], 0);
  const viewers = sum("viewers");
  const webAppliers = sum("webAppliers");
  return {
    viewers,
    webAppliers,
    applyRate: viewers > 0 ? webAppliers / viewers : null,
    mcpCalls: sum("mcpCalls"),
    mcpClients: sum("mcpClients"),
  };
}

export function periodStart(days: MetricsPeriod, now = Date.now()): Date {
  return new Date(now - days * 86_400_000);
}
