import { describe, expect, it } from "vitest";
import {
  ARTICLE_PAGE_SIZE,
  articleListHref,
  paginateArticles,
  parseListQuery,
  sortArticles,
} from "./articleList";

const meta = (slug: string, publishedAt: string) => ({ slug, publishedAt: new Date(publishedAt) });

describe("parseListQuery", () => {
  it("defaults to newest page 1", () => {
    expect(parseListQuery({})).toEqual({ sort: "newest", page: 1 });
  });

  it("accepts likes sort and positive pages", () => {
    expect(parseListQuery({ sort: "likes", page: "3" })).toEqual({ sort: "likes", page: 3 });
  });

  it("rejects unknown sort and non-positive pages", () => {
    expect(parseListQuery({ sort: "hot", page: "0" })).toEqual({ sort: "newest", page: 1 });
    expect(parseListQuery({ page: "nope" })).toEqual({ sort: "newest", page: 1 });
  });
});

describe("sortArticles", () => {
  const a = meta("a", "2026-01-01");
  const b = meta("b", "2026-02-01");
  const c = meta("c", "2026-03-01");

  it("orders by publishedAt descending for 작성/최신순", () => {
    expect(sortArticles([a, c, b], "newest").map((x) => x.slug)).toEqual(["c", "b", "a"]);
  });

  it("orders by like count then publishedAt for 좋아요순", () => {
    const counts = new Map([
      ["a", 5],
      ["b", 5],
      ["c", 1],
    ]);
    expect(sortArticles([a, b, c], "likes", counts).map((x) => x.slug)).toEqual(["b", "a", "c"]);
  });
});

describe("paginateArticles", () => {
  it("uses a default page size of 12 and clamps the page", () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    expect(ARTICLE_PAGE_SIZE).toBe(12);
    expect(paginateArticles(items, 1)).toMatchObject({ page: 1, pageCount: 3, total: 25, items: items.slice(0, 12) });
    expect(paginateArticles(items, 99)).toMatchObject({ page: 3, items: items.slice(24) });
    expect(paginateArticles([], 1)).toMatchObject({ page: 1, pageCount: 1, total: 0, items: [] });
  });
});

describe("articleListHref", () => {
  it("omits default query values", () => {
    expect(articleListHref("/")).toBe("/");
    expect(articleListHref("/", { sort: "newest", page: 1 })).toBe("/");
    expect(articleListHref("/", { sort: "likes", page: 2 })).toBe("/?sort=likes&page=2");
    expect(articleListHref("/c/people", { page: 2 })).toBe("/c/people?page=2");
  });
});
