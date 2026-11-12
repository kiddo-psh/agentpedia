import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import type { Article, MdxComponentName } from "@/content/schema";
import { Compare } from "./Compare";
import { KeyIdea } from "./KeyIdea";
import { makeQuote } from "./Quote";
import { makeTerm } from "./Term";

/** Keyed by MDX_COMPONENTS, so adding an allowed name without a component fails to compile. */
function componentsFor(article: Article) {
  return {
    KeyIdea,
    Quote: makeQuote(article.sources),
    Compare,
    Term: makeTerm(article.terms),
  } satisfies Record<MdxComponentName, unknown>;
}

export async function ArticleBody({ article }: { article: Article }) {
  const { default: Content } = await evaluate(article.bodyMarkdown, {
    ...runtime,
    remarkPlugins: [remarkGfm],
  });
  return (
    <div className="prose-article">
      <Content components={componentsFor(article)} />
    </div>
  );
}
