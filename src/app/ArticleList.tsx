"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORY_LABEL, DIFFICULTY_LABEL, formatDate } from "@/content/labels";
import type { ArticleMeta, Category } from "@/content/schema";

export function ArticleList({ articles }: { articles: ArticleMeta[] }) {
  const [category, setCategory] = useState<Category | "all">("all");
  const present = Object.keys(CATEGORY_LABEL).filter((c) =>
    articles.some((a) => a.category === c),
  ) as Category[];
  const shown = category === "all" ? articles : articles.filter((a) => a.category === category);

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="카테고리">
        {(["all", ...present] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={category === c}
            onClick={() => setCategory(c)}
            className="rounded-full border border-foreground/15 px-3 py-1 text-sm aria-selected:border-foreground aria-selected:bg-foreground aria-selected:text-background"
          >
            {c === "all" ? "전체" : CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="py-16 text-center text-muted">아직 공개된 기사가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-foreground/10 border-y border-foreground/10">
          {shown.map((a) => (
            <li key={a.slug}>
              <Link href={`/a/${a.slug}`} className="group block py-6">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="font-medium text-accent">{CATEGORY_LABEL[a.category]}</span>
                  <span>·</span>
                  <span>{DIFFICULTY_LABEL[a.difficulty]}</span>
                  <span>·</span>
                  <time dateTime={new Date(a.publishedAt).toISOString()}>
                    {formatDate(new Date(a.publishedAt))}
                  </time>
                  {a.draft && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-600 dark:text-amber-400">
                      초안
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold leading-snug group-hover:underline group-hover:underline-offset-4">
                  {a.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{a.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
