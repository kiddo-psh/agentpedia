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
