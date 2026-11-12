import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleBrief } from "@/components/ArticleBrief";
import { ArticleTracking } from "@/components/ArticleTracking";
import { GlossaryPanel } from "@/components/GlossaryPanel";
import { KitSection } from "@/components/KitSection";
import { PersonCard } from "@/components/PersonCard";
import { SourceTiming } from "@/components/SourceTiming";
import { Comments } from "@/components/comments/Comments";
import { ArticleBody } from "@/components/mdx/ArticleBody";
import { CATEGORY_LABEL, DIFFICULTY_LABEL, formatDate, newestPublished, sourcePeriod } from "@/content/labels";
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
    <ArticleTracking slug={article.slug}>
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
        <SourceTiming
          period={sourcePeriod(article.sources)}
          newestIso={newestPublished(article.sources).toISOString()}
        />
        {article.persons.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
            {article.persons.map((p) => (
              <PersonCard key={p.id} person={p} />
            ))}
          </div>
        )}
      </header>

      <ArticleBrief article={article} />

      <div className="relative">
        <ArticleBody article={article} />
        <GlossaryPanel terms={article.terms} />
      </div>

      <KitSection article={article} />

      <section id="comments" className="mt-16 border-t border-foreground/10 pt-10" aria-labelledby="comments-title">
        {/* Comments are request-time data; the article above stays in the static shell. */}
        <Suspense fallback={<p className="text-sm text-muted">토론을 불러오는 중…</p>}>
          <Comments slug={article.slug} />
        </Suspense>
      </section>

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
                · {s.author} ·{" "}
                {s.publishedAt ? formatDate(s.publishedAt) : `날짜 없음 (${formatDate(s.accessedAt!)} 열람)`}
                {s.publishedAt && s.dateNote && <span title={s.dateNote}> (날짜 간접 확인)</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </article>
    </ArticleTracking>
  );
}
