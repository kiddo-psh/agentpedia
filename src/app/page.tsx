import Link from "next/link";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import { ArticleNavLink } from "@/components/ArticleNavLink";
import { ArticlePagination, ArticleSortControls } from "@/components/ArticleListControls";
import { CategoryChips, WithIndex } from "@/components/SiteIndex";
import { paginateArticles, parseListQuery, sortArticles } from "@/content/articleList";
import { CATEGORY_LABEL, DIFFICULTY_LABEL } from "@/content/labels";
import { listArticles } from "@/content/loader";
import type { ArticleMeta, Category } from "@/content/schema";
import { getDb } from "@/db/client";
import { listArticleLikeCounts } from "@/likes/service";
import { ArticleList } from "./ArticleList";
import "./home.css";

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
      <section className="home-hero pt-2">
        <p className="text-[13px] font-medium text-muted">AI 에이전트 백과사전</p>
        <h1 className="mt-3 max-w-[14em] text-4xl leading-[1.12] font-medium tracking-[-0.035em] text-balance sm:text-6xl">
          코딩 에이전트를 출처와 함께 정리합니다
        </h1>
        <p className="mt-5 max-w-[34em] text-lg leading-relaxed text-muted">
          에이전트 페이지는 채택 수치와 벤치마크를, 모델 페이지는 Terminal-Bench와 토큰 단가를 값·출처·기준일과 함께
          보여 줍니다. 기사는 그 맥락을 정리하고, 적용 키트는 MCP로 가져갈 수 있습니다.
        </p>
        <div className="mt-7 flex flex-wrap gap-2.5">
          <Link
            href="/agents"
            prefetch={true}
            className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background hover:opacity-85"
          >
            에이전트 보기
          </Link>
          <Link
            href="/models"
            prefetch={true}
            className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium ring-1 ring-line ring-inset hover:bg-soft"
          >
            모델 비교
          </Link>
        </div>
      </section>

      {articles.length > 0 && (
        <section aria-labelledby="featured-title">
          <div className="mt-20 mb-5">
            <h2 id="featured-title" className="text-2xl font-semibold tracking-tight">
              좋아요 많은 기사
            </h2>
            <p className="mt-1 text-[13px] text-muted">독자가 가장 많이 좋아요한 글입니다</p>
          </div>
          <Suspense fallback={<FeaturedSkeleton count={Math.min(articles.length, 3)} />}>
            <Featured articles={articles} />
          </Suspense>
        </section>
      )}

      <section id="articles" className="home-articles mt-20 scroll-mt-24" aria-labelledby="articles-title">
        <h2 id="articles-title" className="text-2xl font-semibold tracking-tight">
          모든 기사
        </h2>
        <Suspense fallback={<p className="py-10 text-sm text-muted">불러오는 중…</p>}>
          <HomeArticleList articles={articles} searchParams={searchParams} />
        </Suspense>
      </section>
    </WithIndex>
  );
}

// Both rankings in a likes-sorted request use the same live totals.
const getHomeLikeCounts = cache(async () => {
  await connection();
  return listArticleLikeCounts(await getDb());
});

async function HomeArticleList({
  articles,
  searchParams,
}: {
  articles: ArticleMeta[];
  searchParams: PageProps<"/">["searchParams"];
}) {
  const { sort, page } = parseListQuery(await searchParams);
  const sorted = sort === "likes" ? sortArticles(articles, sort, await getHomeLikeCounts()) : articles;
  const slice = paginateArticles(sorted, page);

  return (
    <>
      <div className="mt-1 mb-5 flex flex-wrap items-end justify-between gap-4">
        <p className="text-[13px] text-muted">
          {slice.total}편 · {sort === "likes" ? "좋아요순" : "최신순"}
          {slice.pageCount > 1 ? ` · ${slice.page}/${slice.pageCount}페이지` : null}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <ArticleSortControls basePath="/" sort={sort} />
          <CategoryChips articles={articles} active="all" />
        </div>
      </div>
      <ArticleList articles={slice.items} titleAs="h3" />
      <ArticlePagination basePath="/" sort={sort} page={slice.page} pageCount={slice.pageCount} />
    </>
  );
}

const coverClass = "flex aspect-[16/7] items-end justify-between rounded-2xl sm:aspect-[16/10]";

function FeaturedSkeleton({ count }: { count: number }) {
  return (
    <ul aria-hidden="true" className="grid gap-5 sm:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <div className={`${coverClass} home-placeholder bg-soft`} />
          <div className="mt-4 h-5 w-24 rounded bg-soft" />
          <div className="mt-1.5 h-[2lh] text-[19px] leading-snug">
            <div className="h-4 w-5/6 rounded bg-soft" />
          </div>
          <div className="mt-1.5 h-[2lh] text-[14.5px] leading-relaxed">
            <div className="h-3 w-3/4 rounded bg-soft" />
          </div>
        </li>
      ))}
    </ul>
  );
}

async function Featured({ articles }: { articles: ArticleMeta[] }) {
  const likeCounts = await getHomeLikeCounts();
  const featured = sortArticles(articles, "likes", likeCounts).slice(0, 3);
  return (
    <ul className="home-featured grid gap-5 sm:grid-cols-3">
      {featured.map((a) => {
        const likes = likeCounts.get(a.slug) ?? 0;
        return (
          <li key={a.slug}>
            <ArticleNavLink href={`/a/${a.slug}`} className="group block">
              <div
                className={`${coverClass} bg-linear-135 p-4 text-[13px] font-medium text-foreground/70 ${COVER[a.category]}`}
              >
                <span>{CATEGORY_LABEL[a.category]}</span>
                <span className="tabular-nums">좋아요 {likes}</span>
              </div>
              <p className="mt-4 text-[13px] font-medium text-muted">
                {DIFFICULTY_LABEL[a.difficulty]} · 적용 {a.apply.time}
              </p>
              <h3 className="mt-1.5 min-h-[2lh] text-[19px] leading-snug font-semibold tracking-tight group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                {a.title}
              </h3>
              <p className="mt-1.5 line-clamp-2 min-h-[2lh] text-[14.5px] leading-relaxed text-muted">{a.summary}</p>
            </ArticleNavLink>
          </li>
        );
      })}
    </ul>
  );
}
