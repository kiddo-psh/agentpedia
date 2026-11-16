import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import {
  canViewMetrics,
  METRICS_PERIODS,
  parsePeriod,
  periodStart,
  totalMetrics,
  type MetricsTotals,
} from "@/admin/metrics";
import { listArticles } from "@/content/loader";
import { getDb } from "@/db/client";
import { articleMetrics } from "@/events/metrics";

export const metadata: Metadata = {
  title: "지표",
  robots: { index: false, follow: false },
};

export default function MetricsPage({ searchParams }: PageProps<"/admin/metrics">) {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 pt-2 text-4xl font-medium tracking-[-0.03em]">지표</h1>
      <p className="mb-8 text-sm text-muted">
        조회와 적용은 하루 단위 방문자 수(visitor-day)입니다. 적용은 웹에서 복사하거나 키트를 받은 경우입니다.
      </p>
      <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
        <MetricsView searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function MetricsView({ searchParams }: Pick<PageProps<"/admin/metrics">, "searchParams">) {
  await connection();
  // The proxy already answers 404 with the right status; this guards the page on its own.
  if (!(await canViewMetrics(await headers()))) notFound();

  const days = parsePeriod((await searchParams).days);
  const rows = await articleMetrics(await getDb(), periodStart(days));
  const titles = new Map(listArticles().map((a) => [a.slug, a.title]));
  const total = totalMetrics(rows);
  rows.sort((a, b) => b.viewers - a.viewers || b.mcpCalls - a.mcpCalls);

  return (
    <>
      <nav aria-label="기간" className="mb-6 flex gap-2 text-sm">
        {METRICS_PERIODS.map((p) => (
          <Link
            key={p}
            href={`/admin/metrics?days=${p}`}
            aria-current={p === days ? "page" : undefined}
            className="rounded-full border border-line px-3.5 py-1.5 text-muted hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground"
          >
            최근 {p}일
          </Link>
        ))}
      </nav>

      <dl className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-5">
        <Stat label="전체 적용률" value={formatRate(total.applyRate)} strong />
        <Stat label="조회" value={total.viewers} />
        <Stat label="적용" value={total.webAppliers} />
        <Stat label="MCP 호출" value={total.mcpCalls} />
        <Stat label="MCP 클라이언트" value={total.mcpClients} />
      </dl>

      {rows.length === 0 ? (
        <p className="py-16 text-center text-muted">최근 {days}일 동안 기록된 이벤트가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-[13px] text-muted">
              <tr className="border-b border-line">
                <th className="py-3 pr-4 font-medium">기사</th>
                <Num as="th">조회</Num>
                <Num as="th">적용</Num>
                <Num as="th">적용률</Num>
                <Num as="th">MCP 호출</Num>
                <Num as="th">MCP 클라이언트</Num>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Row key={r.articleSlug} title={titles.get(r.articleSlug)} slug={r.articleSlug} m={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Row({ title, slug, m }: { title: string | undefined; slug: string; m: MetricsTotals }) {
  return (
    <tr className="border-b border-line">
      <td className="py-3 pr-4">
        {title ? (
          <Link href={`/a/${slug}`} className="hover:underline hover:underline-offset-4">
            {title}
          </Link>
        ) : (
          <span className="text-muted">{slug}</span>
        )}
      </td>
      <Num>{m.viewers}</Num>
      <Num>{m.webAppliers}</Num>
      <Num>
        <span className="font-medium">{formatRate(m.applyRate)}</span>
      </Num>
      <Num>{m.mcpCalls}</Num>
      <Num>{m.mcpClients}</Num>
    </tr>
  );
}

function Num({ as: Cell = "td", children }: { as?: "td" | "th"; children: ReactNode }) {
  return <Cell className="py-3 pl-4 text-right font-medium tabular-nums whitespace-nowrap">{children}</Cell>;
}

function Stat({ label, value, strong }: { label: string; value: string | number; strong?: boolean }) {
  return (
    <div className={`bg-background px-5 py-4 ${strong ? "col-span-2 sm:col-span-1" : ""}`}>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className={`mt-1 text-2xl tabular-nums tracking-tight ${strong ? "font-semibold" : "font-medium"}`}>{value}</dd>
    </div>
  );
}

function formatRate(rate: number | null): string {
  return rate === null ? "–" : `${(rate * 100).toFixed(1)}%`;
}
