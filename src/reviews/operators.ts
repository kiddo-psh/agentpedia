import { and, eq, inArray } from "drizzle-orm";
import { parseAdminIds } from "@/admin/metrics";
import type { Db } from "@/db/client";
import { account } from "@/db/schema";

/**
 * GitHub numeric account ids that receive the 운영자 badge.
 * `AGENT_OPERATORS` overrides `METRICS_ADMINS`. Unset uses the metrics admins,
 * so production needs no new variable. An explicit empty value badges nobody.
 */
export function operatorAccountIds(env?: {
  AGENT_OPERATORS?: string;
  METRICS_ADMINS?: string;
}): string[] {
  const source = env ?? process.env;
  if (source.AGENT_OPERATORS !== undefined) return parseAdminIds(source.AGENT_OPERATORS);
  return parseAdminIds(source.METRICS_ADMINS);
}

export async function listOperatorUserIds(db: Db, accountIds = operatorAccountIds()): Promise<Set<string>> {
  if (accountIds.length === 0) return new Set();
  const rows = await db
    .select({ userId: account.userId })
    .from(account)
    .where(and(eq(account.providerId, "github"), inArray(account.accountId, accountIds)));
  return new Set(rows.map((row) => row.userId));
}
