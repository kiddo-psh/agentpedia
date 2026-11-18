import type { ArticleMeta } from "./schema";

/**
 * Product "작성 순" / 최신순 uses article frontmatter `publishedAt` — the canonical
 * authoring/publish date on the content model (not source dates, not `updatedAt`).
 */
export type ArticleSort = "newest" | "likes";

export const ARTICLE_PAGE_SIZE = 12;

export type ListQuery = { sort: ArticleSort; page: number };

export type PageSlice<T> = {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
};

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Reads `?sort=` and `?page=` from a Next.js searchParams object. */
export function parseListQuery(searchParams: {
  sort?: string | string[];
  page?: string | string[];
}): ListQuery {
  const sort = one(searchParams.sort) === "likes" ? "likes" : "newest";
  const rawPage = Number.parseInt(one(searchParams.page) ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  return { sort, page };
}

/** Newest `publishedAt` first; likes sort ties break the same way. */
export function sortArticles<T extends Pick<ArticleMeta, "slug" | "publishedAt">>(
  articles: readonly T[],
  sort: ArticleSort,
  likeCounts: ReadonlyMap<string, number> = new Map(),
): T[] {
  const copy = [...articles];
  const byPublished = (a: T, b: T) => b.publishedAt.getTime() - a.publishedAt.getTime();
  if (sort === "likes") {
    copy.sort((a, b) => {
      const diff = (likeCounts.get(b.slug) ?? 0) - (likeCounts.get(a.slug) ?? 0);
      return diff !== 0 ? diff : byPublished(a, b);
    });
  } else {
    copy.sort(byPublished);
  }
  return copy;
}

export function paginateArticles<T>(
  items: readonly T[],
  page: number,
  pageSize: number = ARTICLE_PAGE_SIZE,
): PageSlice<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageCount,
    total,
  };
}

/** Builds a list URL; omits default sort (`newest`) and page 1. */
export function articleListHref(
  basePath: string,
  opts: { sort?: ArticleSort; page?: number } = {},
): string {
  const params = new URLSearchParams();
  if (opts.sort && opts.sort !== "newest") params.set("sort", opts.sort);
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  const q = params.toString();
  return q ? `${basePath}?${q}` : basePath;
}
