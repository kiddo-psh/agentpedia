import { evaluate } from "@mdx-js/mdx";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { Suspense, type ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import { Comments } from "@/components/comments/Comments";
import { ScoreCostScatter } from "@/components/models/ScoreCostScatter";
import { formatPercent, formatTokensBillions, formatUsd } from "@/components/models/format";
import {
  buildModelsTable,
  buildScatterPoints,
  parseEffort,
} from "@/components/models/metrics";
import { SourceAge } from "@/components/SourceAge";
import { getAgent } from "@/content/agents";
import { formatDate } from "@/content/labels";
import { getModel, listModels } from "@/content/models";
import type { Model, ModelBenchmark, SourcedNumber } from "@/content/schema";
import "../models.css";

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
  const table = buildModelsTable(listModels());
  const scatter = buildScatterPoints(table.rows);
  const tb = model.benchmarks.find((row) => row.bench === "Terminal-Bench" && row.version === "4.1");
  const effort = parseEffort(tb?.model);

  return (
    <article className="mx-auto max-w-[760px]">
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
        <h1 className="text-3xl leading-[1.22] font-medium tracking-[-0.035em] sm:text-[44px]">
          {model.name}
          {effort ? <span className="models-effort ml-2 align-middle text-base">{effort}</span> : null}
        </h1>
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

      <KeyStrip model={model} tb={tb} />

      {scatter.length > 0 ? (
        <section className="mt-10" aria-labelledby="mini-scatter-title">
          <h2 id="mini-scatter-title" className="text-[18px] font-semibold tracking-tight">
            해결률 × 런 비용에서의 위치
          </h2>
          <div className="mt-4">
            <ScoreCostScatter points={scatter} highlightId={slug} compact />
          </div>
        </section>
      ) : null}

      <section className="mt-14" aria-labelledby="price-title">
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
        <BenchmarkCards rows={model.benchmarks} />
      </section>

      {model.relatedAgents.length > 0 ? (
        <section className="mt-16" aria-labelledby="agents-title">
          <h2 id="agents-title" className="text-[22px] font-semibold tracking-tight">
            관련 에이전트
          </h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {model.relatedAgents.map((agentSlug) => {
              const agent = getAgent(agentSlug);
              return (
                <li key={agentSlug}>
                  <Link href={`/agents/${agentSlug}`} prefetch={true} className="models-agent-card">
                    <span className="block text-[15px] font-medium">{agent?.name ?? agentSlug}</span>
                    <span className="mt-1 block text-[12px] text-muted">{agent?.vendor ?? agentSlug}</span>
                  </Link>
                </li>
              );
            })}
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

function KeyStrip({ model, tb }: { model: Model; tb: ModelBenchmark | undefined }) {
  return (
    <dl className="models-key-strip border-y border-line py-5">
      <div>
        <dt className="text-[12px] text-muted">해결률</dt>
        <dd className="mt-1 text-lg font-medium tabular-nums">
          {tb ? formatPercent(tb.score, tb.margin) : "없음"}
        </dd>
      </div>
      <div>
        <dt className="text-[12px] text-muted">런 비용(전체)</dt>
        <dd className="mt-1 text-lg font-medium tabular-nums">
          {tb?.costUsd !== undefined ? formatUsd(tb.costUsd) : tb?.cost ?? "없음"}
        </dd>
      </div>
      <div>
        <dt className="text-[12px] text-muted">토큰</dt>
        <dd className="mt-1 text-lg font-medium tabular-nums">
          {tb?.tokensBillions !== undefined ? formatTokensBillions(tb.tokensBillions) : "없음"}
        </dd>
      </div>
      <div>
        <dt className="text-[12px] text-muted">입력 $/1M</dt>
        <dd className="mt-1 text-lg font-medium tabular-nums">
          {model.inputUsdPerMTok ? money.format(model.inputUsdPerMTok.value) : "없음"}
        </dd>
      </div>
    </dl>
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

function BenchmarkCards({ rows }: { rows: ModelBenchmark[] }) {
  if (rows.length === 0) return <p className="mt-2 text-sm text-muted">확인한 값이 없습니다.</p>;
  return (
    <ul className="models-bench-cards mt-4">
      {rows.map((row) => (
        <li key={`${row.bench}-${row.agentHarness}-${row.score}`} className="models-bench-card">
          <p className="text-sm">
            <a href={row.url} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2">
              {row.bench}
              {row.version ? ` ${row.version}` : ""}
            </a>
            <span className="text-muted"> · {row.scoreKind === "model" ? "모델 점수" : "하네스 점수"}</span>
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-3">
            <div>
              <dt className="text-muted">하네스</dt>
              <dd>{row.agentHarness}</dd>
            </div>
            <div>
              <dt className="text-muted">해결률</dt>
              <dd className="tabular-nums font-medium">
                {row.score}
                {row.unit}
                {row.margin !== undefined ? ` ± ${row.margin}${row.unit}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted">런 비용(전체)</dt>
              <dd>{row.cost ?? "없음"}</dd>
            </div>
            <div>
              <dt className="text-muted">토큰</dt>
              <dd>{row.tokensBillions !== undefined ? `${row.tokensBillions}B` : "없음"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">시점</dt>
              <dd className="inline-flex flex-wrap items-center gap-x-2">
                <span>{formatDate(row.asOf)}</span>
                <SourceAge newestIso={row.asOf.toISOString()} />
              </dd>
              {row.note ? <p className="mt-1 text-muted">{row.note}</p> : null}
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
