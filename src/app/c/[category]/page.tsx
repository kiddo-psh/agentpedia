import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
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

/**
 * Params are awaited outside Suspense on purpose (same as /a/[slug]): every category is
 * prerendered, so the sidebar + heading can paint and update `aria-current` without waiting on
 * searchParams. Only the paginated list sits behind the boundary.
 * docs/perf/2026-11-14-first-paint.md; docs/sidebar-tab-switch-perf.md
 */
export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/c/[category]">) {
  const { category } = await params;
  if (!isCategory(category)) notFound();

  return (
    <CategoryShell
      category={category}
      list={
        <Suspense fallback={<p className="py-10 text-sm text-muted">불러오는 중…</p>}>
          <CategoryArticles category={category} searchParams={searchParams} />
        </Suspense>
      }
    />
  );
}

/**
 * Cached like ArticleView so category chrome + article index land in the prerendered segment
 * instead of re-filtering on every soft navigation.
 */
async function CategoryShell({ category, list }: { category: Category; list: ReactNode }) {
  "use cache";
  const articles = listArticles();
  const total = articles.filter((a) => a.category === category).length;

  return (
    <WithIndex articles={articles} active={category}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 pt-2">
        <div>
          <p className="text-[13px] font-medium text-muted">기사 {total}편 · 최신순</p>
          <h1 className="mt-2 text-4xl font-medium tracking-[-0.03em]">{CATEGORY_LABEL[category]}</h1>
        </div>
        <CategoryChips articles={articles} active={category} />
      </div>
      {list}
    </WithIndex>
  );
}

async function CategoryArticles({
  category,
  searchParams,
}: {
  category: Category;
  searchParams: PageProps<"/c/[category]">["searchParams"];
}) {
  const { page } = parseListQuery(await searchParams);
  return <CategoryList category={category} page={page} />;
}

async function CategoryList({ category, page }: { category: Category; page: number }) {
  "use cache";
  const shown = sortArticles(
    listArticles().filter((a) => a.category === category),
    "newest",
  );
  const slice = paginateArticles(shown, page);
  const basePath = `/c/${category}`;

  return (
    <>
      {slice.pageCount > 1 ? (
        <p className="mb-4 text-[13px] text-muted">
          {slice.page}/{slice.pageCount}페이지
        </p>
      ) : null}
      <ArticleList articles={slice.items} />
      <ArticlePagination basePath={basePath} page={slice.page} pageCount={slice.pageCount} />
    </>
  );
}
