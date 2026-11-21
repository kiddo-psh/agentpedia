import { evaluate } from "@mdx-js/mdx";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { Suspense, type ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import { Comments } from "@/components/comments/Comments";
import { AgentReviews } from "@/components/reviews/Reviews";
import { SourceAge } from "@/components/SourceAge";
import { FORM_LABEL, getAgent, listAgents } from "@/content/agents";
import { formatDate } from "@/content/labels";
import type { AgentBenchmark, SourcedNumber, SourcedText } from "@/content/schema";

const PLACEHOLDER = "__none__";
const countFormat = new Intl.NumberFormat("ko-KR");

export function generateStaticParams() {
  const slugs = listAgents().map((agent) => ({ slug: agent.slug }));
  return slugs.length > 0 ? slugs : [{ slug: PLACEHOLDER }];
}

export async function generateMetadata({ params }: PageProps<"/agents/[slug]">): Promise<Metadata> {
  const agent = getAgent((await params).slug);
  if (!agent) return {};
  const description = `${agent.vendor} · ${agent.form.map((form) => FORM_LABEL[form]).join(" · ")}`;
  return {
    title: agent.name,
    description,
    openGraph: { title: agent.name, description, url: `/agents/${agent.slug}` },
  };
}

// params is awaited here so the title can paint with the prerendered shell, same as /a/[slug].
export default async function AgentPage({ params }: PageProps<"/agents/[slug]">) {
  const { slug } = await params;
  const agent = getAgent(slug);
  if (!agent) notFound();
  return (
    <AgentView
      slug={slug}
      reviews={
        <Suspense fallback={<p className="mt-4 text-sm text-muted">리뷰를 불러오는 중…</p>}>
          <AgentReviews slug={slug} />
        </Suspense>
      }
      comments={
        <Suspense fallback={<p className="text-sm text-muted">토론을 불러오는 중…</p>}>
          <Comments slug={`agent:${slug}`} returnPath={`/agents/${slug}#comments`} />
        </Suspense>
      }
    />
  );
}

async function AgentView({
  slug,
  reviews,
  comments,
}: {
  slug: string;
  reviews: ReactNode;
  comments: ReactNode;
}) {
  "use cache";
  cacheLife("days");
  const agent = getAgent(slug)!;
  const modelRows = agent.benchmarks.filter((row) => row.scoreKind === "model");
  const harnessRows = agent.benchmarks.filter((row) => row.scoreKind === "harness");
  const { default: Content } = await evaluate(agent.bodyMarkdown, {
    ...runtime,
    remarkPlugins: [[remarkGfm, { singleTilde: false }]],
  });

  return (
    <article className="mx-auto max-w-[720px]">
      <header className="mb-10">
        <nav className="mb-5 text-sm text-muted" aria-label="위치">
          <Link href="/agents" prefetch={true} className="hover:text-foreground">
            에이전트
          </Link>
          <span className="mx-1.5" aria-hidden>
            ›
          </span>
          <span>{agent.name}</span>
        </nav>
        <h1 className="text-3xl leading-[1.22] font-medium tracking-[-0.035em] sm:text-[44px]">{agent.name}</h1>
        <p className="mt-4 text-sm text-muted">
          <span className="font-medium text-foreground">{agent.vendor}</span>
          <span> · {agent.form.map((form) => FORM_LABEL[form]).join(" · ")}</span>
          {agent.license ? <span> · {agent.license}</span> : null}
          {agent.repoUrl ? (
            <>
              <span> · </span>
              <a href={agent.repoUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                저장소
              </a>
            </>
          ) : null}
        </p>
      </header>

      <section aria-labelledby="adoption-title">
        <h2 id="adoption-title" className="text-[22px] font-semibold tracking-tight">
          채택
        </h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <SourcedNumberFact label="npm 주간 다운로드" fact={agent.npmWeeklyDownloads} format={countFormat.format} />
          <SourcedNumberFact label="GitHub 별" fact={agent.githubStars} format={countFormat.format} />
          <SourcedNumberFact label="설문 사용률" fact={agent.surveyUsage} format={(value) => `${value}%`} />
          <SourcedTextFact label="최신 릴리스" fact={agent.latestVersion} />
          <div className="sm:col-span-2">
            <SourcedTextFact label="요금" fact={agent.pricingSummary} />
          </div>
        </div>
        {agent.surveyUsage ? (
          <p className="mt-4 text-sm text-muted">
            설문은 Stack Overflow Developer Survey 2026 코딩 에이전트 문항입니다. 지난 1년 사용(Used) 비율이고, 응답
            데이터는 ODbL 1.0입니다.
          </p>
        ) : null}
      </section>

      <section className="mt-16" aria-labelledby="bench-title">
        <h2 id="bench-title" className="text-[22px] font-semibold tracking-tight">
          벤치마크
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          한 행은 하네스와 모델의 조합입니다. 모델 점수는 이 제품이 아닌 고정 하네스에서 그 모델을 잰 값이고, 하네스
          점수는 이 제품으로 잰 값입니다.
        </p>
        <BenchmarkTable title="모델 점수" rows={modelRows} />
        <BenchmarkTable title="하네스 점수" rows={harnessRows} />
      </section>

      <div className="prose-article mt-16">
        <Content />
      </div>

      <section id="reviews" className="mt-16 scroll-mt-24" aria-labelledby="reviews-title">
        <h2 id="reviews-title" className="text-[22px] font-semibold tracking-tight">
          리뷰
        </h2>
        {reviews}
      </section>

      <section id="comments" className="mt-16 scroll-mt-24" aria-labelledby="comments-title">
        {comments}
      </section>
    </article>
  );
}

function SourcedNumberFact({
  label,
  fact,
  format,
}: {
  label: string;
  fact: SourcedNumber | undefined;
  format: (value: number) => string;
}) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1">
        {fact ? <SourcedValue text={format(fact.value)} fact={fact} /> : <span className="text-muted">없음</span>}
      </dd>
    </div>
  );
}

function SourcedTextFact({ label, fact }: { label: string; fact: SourcedText | undefined }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1">
        {fact ? <SourcedValue text={fact.value} fact={fact} /> : <span className="text-muted">없음</span>}
      </dd>
    </div>
  );
}

function SourcedValue({ text, fact }: { text: string; fact: { sourceUrl: string; asOf: Date } }) {
  return (
    <>
      <span className="font-medium">{text}</span>
      <span className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
        <span>{formatDate(fact.asOf)}</span>
        <SourceAge newestIso={fact.asOf.toISOString()} />
        <a href={fact.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          출처
        </a>
      </span>
    </>
  );
}

function BenchmarkTable({ title, rows }: { title: string; rows: AgentBenchmark[] }) {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-medium">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">확인한 값이 없습니다.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-b border-line text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 pr-4 font-medium">벤치</th>
                <th className="py-2 pr-4 font-medium">모델</th>
                <th className="py-2 pr-4 font-medium">하네스</th>
                <th className="py-2 pr-4 font-medium">점수</th>
                <th className="py-2 pr-4 font-medium">비용</th>
                <th className="py-2 font-medium">시점</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.bench}-${row.model}-${row.agentHarness}`} className="border-t border-line align-top">
                  <td className="py-3 pr-4">
                    <a href={row.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                      {row.bench}
                      {row.version ? ` ${row.version}` : ""}
                    </a>
                  </td>
                  <td className="py-3 pr-4">{row.model}</td>
                  <td className="py-3 pr-4">{row.agentHarness}</td>
                  <td className="py-3 pr-4 tabular-nums">
                    {row.score}
                    {row.unit}
                    {row.margin !== undefined ? ` ± ${row.margin}${row.unit}` : ""}
                  </td>
                  <td className="py-3 pr-4">{row.cost ?? "없음"}</td>
                  <td className="py-3">
                    <span className="inline-flex flex-wrap items-center gap-x-2">
                      <span>{formatDate(row.asOf)}</span>
                      <SourceAge newestIso={row.asOf.toISOString()} />
                    </span>
                    {row.note ? <span className="mt-1 block text-muted">{row.note}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
