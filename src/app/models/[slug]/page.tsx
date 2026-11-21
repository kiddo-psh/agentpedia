import { evaluate } from "@mdx-js/mdx";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { Suspense, type ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import { Comments } from "@/components/comments/Comments";
import { SourceAge } from "@/components/SourceAge";
import { formatDate } from "@/content/labels";
import { getModel, listModels } from "@/content/models";
import type { ModelBenchmark, SourcedNumber } from "@/content/schema";

const PLACEHOLDER = "__none__";
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function generateStaticParams() {
  const slugs = listModels().map((model) => ({ slug: model.slug }));
  return slugs.length > 0 ? slugs : [{ slug: PLACEHOLDER }];
}

export async function generateMetadata({ params }: PageProps<"/models/[slug]">): Promise<Metadata> {
  const model = getModel((await params).slug);
  if (!model) return {};
  const description = `${model.vendor} 모델의 벤치마크와 토큰 단가`;
  return {
    title: model.name,
    description,
    openGraph: { title: model.name, description, url: `/models/${model.slug}` },
  };
}

export default async function ModelPage({ params }: PageProps<"/models/[slug]">) {
  const { slug } = await params;
  const model = getModel(slug);
  if (!model) notFound();
  return (
    <ModelView
      slug={slug}
      comments={
        <Suspense fallback={<p className="text-sm text-muted">토론을 불러오는 중…</p>}>
          <Comments slug={`model:${slug}`} returnPath={`/models/${slug}#comments`} />
        </Suspense>
      }
    />
  );
}

async function ModelView({ slug, comments }: { slug: string; comments: ReactNode }) {
  "use cache";
  cacheLife("days");
  const model = getModel(slug)!;
  const { default: Content } = await evaluate(model.bodyMarkdown, {
    ...runtime,
    remarkPlugins: [[remarkGfm, { singleTilde: false }]],
  });

  return (
    <article className="mx-auto max-w-[720px]">
      <header className="mb-10">
        <nav className="mb-5 text-sm text-muted" aria-label="위치">
          <Link href="/models" prefetch={true} className="hover:text-foreground">
            모델
          </Link>
          <span className="mx-1.5" aria-hidden>
            ›
          </span>
          <span>{model.name}</span>
        </nav>
        <h1 className="text-3xl leading-[1.22] font-medium tracking-[-0.035em] sm:text-[44px]">{model.name}</h1>
        <p className="mt-4 text-sm text-muted">
          <span className="font-medium text-foreground">{model.vendor}</span>
          {model.openRouterId ? (
            <>
              <span> · </span>
              <a
                href={`https://openrouter.ai/${model.openRouterId}`}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                OpenRouter
              </a>
            </>
          ) : null}
        </p>
      </header>

      <section aria-labelledby="price-title">
        <h2 id="price-title" className="text-[22px] font-semibold tracking-tight">
          토큰 단가
        </h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <PriceFact label="입력 / 1M" fact={model.inputUsdPerMTok} />
          <PriceFact label="출력 / 1M" fact={model.outputUsdPerMTok} />
        </div>
      </section>

      <section className="mt-16" aria-labelledby="bench-title">
        <h2 id="bench-title" className="text-[22px] font-semibold tracking-tight">
          벤치마크
        </h2>
        <BenchmarkTable rows={model.benchmarks} />
      </section>

      {model.relatedAgents.length > 0 ? (
        <section className="mt-16" aria-labelledby="agents-title">
          <h2 id="agents-title" className="text-[22px] font-semibold tracking-tight">
            관련 에이전트
          </h2>
          <ul className="mt-4 flex flex-wrap gap-3 text-sm">
            {model.relatedAgents.map((agent) => (
              <li key={agent}>
                <Link href={`/agents/${agent}`} prefetch={true} className="underline underline-offset-2">
                  {agent}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="prose-article mt-16">
        <Content />
      </div>

      <section id="comments" className="mt-16 scroll-mt-24" aria-labelledby="comments-title">
        {comments}
      </section>
    </article>
  );
}

function PriceFact({ label, fact }: { label: string; fact: SourcedNumber | undefined }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1">
        {fact ? (
          <>
            <span className="font-medium">{money.format(fact.value)}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
              <span>{formatDate(fact.asOf)}</span>
              <SourceAge newestIso={fact.asOf.toISOString()} />
              <a href={fact.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                출처
              </a>
            </span>
          </>
        ) : (
          <span className="text-muted">없음</span>
        )}
      </dd>
    </div>
  );
}

function BenchmarkTable({ rows }: { rows: ModelBenchmark[] }) {
  if (rows.length === 0) return <p className="mt-2 text-sm text-muted">확인한 값이 없습니다.</p>;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[720px] border-b border-line text-left text-sm">
        <thead className="text-muted">
          <tr>
            <th className="py-2 pr-4 font-medium">벤치</th>
            <th className="py-2 pr-4 font-medium">하네스</th>
            <th className="py-2 pr-4 font-medium">점수</th>
            <th className="py-2 pr-4 font-medium">비용</th>
            <th className="py-2 pr-4 font-medium">토큰</th>
            <th className="py-2 font-medium">시점</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.bench}-${row.agentHarness}-${row.score}`} className="border-t border-line align-top">
              <td className="py-3 pr-4">
                <a href={row.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  {row.bench}
                  {row.version ? ` ${row.version}` : ""}
                </a>
                <span className="mt-1 block text-muted">{row.scoreKind === "model" ? "모델 점수" : "하네스 점수"}</span>
              </td>
              <td className="py-3 pr-4">{row.agentHarness}</td>
              <td className="py-3 pr-4 tabular-nums">
                {row.score}
                {row.unit}
                {row.margin !== undefined ? ` ± ${row.margin}${row.unit}` : ""}
              </td>
              <td className="py-3 pr-4">{row.cost ?? "없음"}</td>
              <td className="py-3 pr-4">{row.tokensBillions !== undefined ? `${row.tokensBillions}B` : "없음"}</td>
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
  );
}
