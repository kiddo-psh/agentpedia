import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryChips, WithIndex } from "@/components/SiteIndex";
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

// params is URL data: keep it behind Suspense so client navigation can show the shell instantly.
export default function CategoryPage({ params }: PageProps<"/c/[category]">) {
  return (
    <Suspense>
      {params.then(({ category }) => (
        <CategoryView category={category} />
      ))}
    </Suspense>
  );
}

function CategoryView({ category }: { category: string }) {
  if (!isCategory(category)) notFound();
  const articles = listArticles();
  const shown = articles.filter((a) => a.category === category);

  return (
    <WithIndex articles={articles} active={category}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 pt-2">
        <div>
          <p className="text-[13px] font-medium text-muted">기사 {shown.length}편</p>
          <h1 className="mt-2 text-4xl font-medium tracking-[-0.03em]">{CATEGORY_LABEL[category]}</h1>
        </div>
        <CategoryChips articles={articles} active={category} />
      </div>
      <ArticleList articles={shown} />
    </WithIndex>
  );
}
