import { sql } from "drizzle-orm";
import type { Db } from "@/db/client";

export type ArticleMetrics = {
  articleSlug: string;
  viewers: number;
  webAppliers: number;
  /** webAppliers / viewers; null when nobody viewed. The north-star metric. */
  applyRate: number | null;
  mcpCalls: number;
  mcpClients: number;
};

/** Distinct visitors are per-day hashes, so these are visitor-days rather than people. */
export async function articleMetrics(db: Db, since: Date): Promise<ArticleMetrics[]> {
  type Row = {
    article_slug: string;
    viewers: number;
    web_appliers: number;
    mcp_calls: number;
    mcp_clients: number;
  };
  const result: unknown = await db.execute(sql`
    select
      article_slug,
      count(distinct visitor_hash) filter (where kind = 'view')::int as viewers,
      count(distinct visitor_hash) filter (where kind in ('web_copy', 'kit_download'))::int as web_appliers,
      count(*) filter (where kind like 'mcp\\_%')::int as mcp_calls,
      count(distinct visitor_hash) filter (where kind like 'mcp\\_%')::int as mcp_clients
    from events
    where created_at >= ${since.toISOString()}
    group by article_slug
    order by article_slug
  `);
  // postgres-js returns an array; PGlite returns { rows }.
  const list = (Array.isArray(result) ? result : (result as { rows: Row[] }).rows) as Row[];
  return list.map((r) => ({
    articleSlug: r.article_slug,
    viewers: r.viewers,
    webAppliers: r.web_appliers,
    applyRate: r.viewers > 0 ? r.web_appliers / r.viewers : null,
    mcpCalls: r.mcp_calls,
    mcpClients: r.mcp_clients,
  }));
}

/** A visit counts as a return when it falls on another day than the first, in this time zone. */
const VISIT_DAY_TZ = "Asia/Seoul";
export const RETURN_WINDOW_DAYS = 28;

export type ReturnRate = {
  /** Browsers whose first visit fell in [cohortFrom, cohortTo). */
  cohortFrom: Date;
  cohortTo: Date;
  visitors: number;
  /** Visitors who came back on another day within 28 days of their first visit. */
  returning: number;
  /** returning / visitors; null when the cohort is empty. */
  rate: number | null;
};

/**
 * Share of anonymous browsers (the `ap_vid` cookie) that visited on two or more days within
 * four weeks. Pick `cohortTo` at least 28 days ago, or recent visitors have not had the full
 * window to come back yet.
 */
export async function returnRate(db: Db, cohortFrom: Date, cohortTo: Date): Promise<ReturnRate> {
  type Row = { visitors: number; returning: number };
  const result: unknown = await db.execute(sql`
    with cohort as (
      select visitor_id, min(created_at) as first_at
      from events
      where visitor_id is not null
      group by visitor_id
      having min(created_at) >= ${cohortFrom.toISOString()} and min(created_at) < ${cohortTo.toISOString()}
    )
    select
      count(*)::int as visitors,
      count(*) filter (where exists (
        select 1 from events e
        where e.visitor_id = c.visitor_id
          and e.created_at < c.first_at + make_interval(days => ${RETURN_WINDOW_DAYS})
          and (e.created_at at time zone ${VISIT_DAY_TZ})::date <> (c.first_at at time zone ${VISIT_DAY_TZ})::date
      ))::int as returning
    from cohort c
  `);
  const [r] = (Array.isArray(result) ? result : (result as { rows: Row[] }).rows) as Row[];
  return {
    cohortFrom,
    cohortTo,
    visitors: r.visitors,
    returning: r.returning,
    rate: r.visitors > 0 ? r.returning / r.visitors : null,
  };
}
