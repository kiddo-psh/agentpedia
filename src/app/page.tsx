import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArticlePagination, ArticleSortControls } from "@/components/ArticleListControls";
import { CategoryChips, WithIndex } from "@/components/SiteIndex";
import { paginateArticles, parseListQuery, sortArticles, type ArticleSort } from "@/content/articleList";
import { CATEGORY_LABEL, DIFFICULTY_LABEL } from "@/content/labels";
import { listArticles } from "@/content/loader";
import type { ArticleMeta, Category } from "@/content/schema";
import { getDb } from "@/db/client";
import { listArticleLikeCounts } from "@/likes/service";
import { ArticleList } from "./ArticleList";

/** A quiet wash per category stands in for cover art until articles have images of their own. */
const COVER: Record<Category, string> = {
  people: "from-[#d7e3ff] to-[#f1e6ff] dark:from-[#1b2335] dark:to-[#271d33]",
  trends: "from-[#ffe2d2] to-[#fff1c2] dark:from-[#33231b] dark:to-[#2f2a17]",
  startup: "from-[#d3f3e6] to-[#dcefff] dark:from-[#16291f] dark:to-[#172533]",
  security: "from-[#e9e9e9] to-[#fde0e0] dark:from-[#202020] dark:to-[#331c1c]",
};

export default function Home({ searchParams }: PageProps<"/">) {
  const articles = listArticles();

  return (
    <WithIndex articles={articles} active="all">
      <section className="pt-2">
        <p className="text-[13px] font-medium text-muted">AI 에이전트 백과사전</p>
        <h1 className="mt-3 max-w-[14em] text-4xl leading-[1.12] font-medium tracking-[-0.035em] sm:text-6xl">
          읽고, 내 프로젝트에 바로 적용하세요
        </h1>
        <p className="mt-5 max-w-[34em] text-lg leading-relaxed text-muted">
          에이전트 시대를 이끄는 사람과 사례를 정리했습니다. 기사마다 진단 프롬프트와 적용 키트가 있어, 에이전트가
          MCP로 바로 가져다 씁니다.
        </p>
        <div className="mt-7 flex flex-wrap gap-2.5">
          <Link
            href="/connect"
            className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background hover:opacity-85"
          >
            에이전트 연결하기
          </Link>
          <a
            href="#articles"
            className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium ring-1 ring-line ring-inset hover:bg-soft"
          >
            모든 기사 보기
          </a>
        </div>
      </section>

      <Suspense
        fallback={
          <>
            <FeaturedSkeleton />
            <ArticlesSkeleton articles={articles} />
          </>
        }
      >
        <HomeLists articles={articles} searchParams={searchParams} />
      </Suspense>
    </WithIndex>
  );
}

async function HomeLists({
  articles,
  searchParams,
}: {
  articles: ArticleMeta[];
  searchParams: PageProps<"/">["searchParams"];
}) {
  await connection();
  const { sort, page } = parseListQuery(await searchParams);
  const likeCounts = await getDb().then(listArticleLikeCounts);
  const featured = sortArticles(articles, "likes", likeCounts).slice(0, 3);
  const sorted = sortArticles(articles, sort, likeCounts);
  const slice = paginateArticles(sorted, page);

  return (
    <>
      {featured.length > 0 && <Featured articles={featured} likeCounts={likeCounts} />}
      <section id="articles" className="scroll-mt-24" aria-labelledby="articles-title">
        <div className="mt-20 mb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 id="articles-title" className="text-2xl font-semibold tracking-tight">
              모든 기사
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              {slice.total}편 · {sortLabel(sort)}
              {slice.pageCount > 1 ? ` · ${slice.page}/${slice.pageCount}페이지` : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ArticleSortControls basePath="/" sort={sort} />
            <CategoryChips articles={articles} active="all" />
          </div>
        </div>
        <ArticleList articles={slice.items} titleAs="h3" />
        <ArticlePagination basePath="/" sort={sort} page={slice.page} pageCount={slice.pageCount} />
      </section>
    </>
  );
}

function sortLabel(sort: ArticleSort) {
  return sort === "likes" ? "좋아요순" : "최신순";
}

function FeaturedSkeleton() {
  return (
    <section aria-hidden className="mt-20">
      <div className="mb-5 h-8 w-48 rounded bg-soft" />
      <div className="grid gap-5 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-56 rounded-2xl bg-soft" />
        ))}
      </div>
    </section>
  );
}

function ArticlesSkeleton({ articles }: { articles: ArticleMeta[] }) {
  return (
    <section id="articles" className="scroll-mt-24" aria-labelledby="articles-title">
      <div className="mt-20 mb-5 flex flex-wrap items-baseline justify-between gap-4">
        <h2 id="articles-title" className="text-2xl font-semibold tracking-tight">
          모든 기사
        </h2>
        <CategoryChips articles={articles} active="all" />
      </div>
      <p className="py-10 text-sm text-muted">불러오는 중…</p>
    </section>
  );
}

function Featured({
  articles,
  likeCounts,
}: {
  articles: ArticleMeta[];
  likeCounts: ReadonlyMap<string, number>;
}) {
  return (
    <section aria-labelledby="featured-title">
      <div className="mt-20 mb-5">
        <h2 id="featured-title" className="text-2xl font-semibold tracking-tight">
          좋아요 많은 기사
        </h2>
        <p className="mt-1 text-[13px] text-muted">독자가 가장 많이 좋아요한 글입니다</p>
      </div>
      <ul className="grid gap-5 sm:grid-cols-3">
        {articles.map((a) => {
          const likes = likeCounts.get(a.slug) ?? 0;
          return (
            <li key={a.slug}>
              <Link href={`/a/${a.slug}`} className="group block">
                <div
                  className={`flex aspect-[16/7] items-end justify-between rounded-2xl bg-linear-135 p-4 text-[13px] font-medium text-foreground/70 sm:aspect-[16/10] ${COVER[a.category]}`}
                >
                  <span>{CATEGORY_LABEL[a.category]}</span>
                  <span className="tabular-nums">좋아요 {likes}</span>
                </div>
                <p className="mt-4 text-[13px] font-medium text-muted">
                  {DIFFICULTY_LABEL[a.difficulty]} · 적용 {a.apply.time}
                </p>
                <h3 className="mt-1.5 text-[19px] leading-snug font-semibold tracking-tight group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                  {a.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-[14.5px] leading-relaxed text-muted">{a.summary}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
