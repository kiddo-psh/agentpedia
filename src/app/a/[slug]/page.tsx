import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { KitSection } from "@/components/KitSection";
import { ArticleBody } from "@/components/mdx/ArticleBody";
import { CATEGORY_LABEL, DIFFICULTY_LABEL, formatDate } from "@/content/labels";
import { getArticle, listArticles } from "@/content/loader";

// Cache Components requires at least one param; a placeholder 404s when nothing is published.
const PLACEHOLDER = "__none__";

export function generateStaticParams() {
  const slugs = listArticles().map((a) => ({ slug: a.slug }));
  return slugs.length > 0 ? slugs : [{ slug: PLACEHOLDER }];
}

export async function generateMetadata({ params }: PageProps<"/a/[slug]">): Promise<Metadata> {
  const article = getArticle((await params).slug);
  return article ? { title: article.title, description: article.summary } : {};
}

// params is URL data: keep it behind Suspense so client navigation can show the shell instantly.
export default function ArticlePage({ params }: PageProps<"/a/[slug]">) {
  return (
    <Suspense fallback={<ArticleSkeleton />}>
      {params.then(({ slug }) => (
        <ArticleView slug={slug} />
      ))}
    </Suspense>
  );
}

function ArticleSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="기사를 불러오는 중">
      <div className="mb-4 h-4 w-40 rounded bg-foreground/10" />
      <div className="mb-3 h-9 w-full rounded bg-foreground/10" />
      <div className="mb-10 h-9 w-2/3 rounded bg-foreground/10" />
      <div className="h-48 rounded-xl bg-foreground/5" />
    </div>
  );
}

async function ArticleView({ slug }: { slug: string }) {
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <article>
      <header className="mb-10">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="font-medium text-accent">{CATEGORY_LABEL[article.category]}</span>
          <span>·</span>
          <span>{DIFFICULTY_LABEL[article.difficulty]}</span>
          <span>·</span>
          <time dateTime={article.publishedAt.toISOString()}>{formatDate(article.publishedAt)}</time>
          {article.draft && (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              초안 · 검수 전
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{article.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">{article.summary}</p>
        {article.people.length > 0 && (
          <p className="mt-4 text-sm text-muted">다루는 인물: {article.people.join(", ")}</p>
        )}
      </header>

      <section className="mb-12 rounded-xl bg-foreground/[.03] p-6" aria-labelledby="key-ideas">
        <h2 id="key-ideas" className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
          이 글의 핵심 {article.keyIdeas.length}가지
        </h2>
        <ol className="grid gap-3">
          {article.keyIdeas.map((idea, i) => (
            <li key={i} className="flex gap-3 leading-relaxed">
              <span className="font-mono text-sm font-semibold text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span>{idea}</span>
            </li>
          ))}
        </ol>
      </section>

      <ArticleBody article={article} />

      <KitSection article={article} />

      <section className="mt-16 border-t border-foreground/10 pt-8" aria-labelledby="sources">
        <h2 id="sources" className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
          출처
        </h2>
        <ul className="grid gap-2 text-sm">
          {article.sources.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                {s.title}
              </a>
              <span className="text-muted">
                {" "}
                · {s.author} · {formatDate(s.publishedAt)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
