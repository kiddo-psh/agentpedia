import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticlePagination } from "@/components/ArticleListControls";
import { CategoryChips, WithIndex } from "@/components/SiteIndex";
import { paginateArticles, parseListQuery, sortArticles } from "@/content/articleList";
import { CATEGORY_LABEL } from "@/content/labels";
import { listArticles } from "@/content/loader";
import type { Category } from "@/content/schema";
import { ArticleList } from "../../ArticleList";

const isCategory = (c: string): c is Category => c in CATEGORY_LABEL;

export function generateStaticParams() {
  return Object.keys(CATEGORY_LABEL).map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps<"/c/[category]">): Promise<Metadata> {
  const { category } = await params;
  return isCategory(category) ? { title: `${CATEGORY_LABEL[category]} 기사` } : {};
}

// params / searchParams are URL data: keep them behind Suspense so client navigation can show the shell instantly.
export default function CategoryPage({ params, searchParams }: PageProps<"/c/[category]">) {
  return (
    <Suspense fallback={<p className="pt-2 text-sm text-muted">불러오는 중…</p>}>
      <CategoryView params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CategoryView({
  params,
  searchParams,
}: {
  params: PageProps<"/c/[category]">["params"];
  searchParams: PageProps<"/c/[category]">["searchParams"];
}) {
  const { category } = await params;
  if (!isCategory(category)) notFound();

  const { page } = parseListQuery(await searchParams);
  const articles = listArticles();
  // Category lists always use 작성순 (`publishedAt`); sort controls live on 전체 only.
  const shown = sortArticles(
    articles.filter((a) => a.category === category),
    "newest",
  );
  const slice = paginateArticles(shown, page);
  const basePath = `/c/${category}`;

  return (
    <WithIndex articles={articles} active={category}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 pt-2">
        <div>
          <p className="text-[13px] font-medium text-muted">
            기사 {slice.total}편 · 최신순
            {slice.pageCount > 1 ? ` · ${slice.page}/${slice.pageCount}페이지` : null}
          </p>
          <h1 className="mt-2 text-4xl font-medium tracking-[-0.03em]">{CATEGORY_LABEL[category]}</h1>
        </div>
        <CategoryChips articles={articles} active={category} />
      </div>
      <ArticleList articles={slice.items} />
      <ArticlePagination basePath={basePath} page={slice.page} pageCount={slice.pageCount} />
    </WithIndex>
  );
}
