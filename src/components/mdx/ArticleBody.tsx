import { evaluate } from "@mdx-js/mdx";
import type { ComponentProps } from "react";
import { isValidElement } from "react";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import type { Article, MdxComponentName } from "@/content/schema";
import { Compare } from "./Compare";
import { KeyIdea } from "./KeyIdea";
import { Pyramid, PyramidLayer } from "./Pyramid";
import { EditorialQuote, makeQuote } from "./Quote";
import { makeTerm } from "./Term";

/** Keyed by MDX_COMPONENTS, so adding an allowed name without a component fails to compile. */
function componentsFor(article: Article) {
  return {
    KeyIdea,
    Quote: makeQuote(article.sources),
    Compare,
    Term: makeTerm(article.terms),
    Pyramid,
    PyramidLayer,
  } satisfies Record<MdxComponentName, unknown>;
}

export async function ArticleBody({ article }: { article: Article }) {
  const { default: Content } = await evaluate(article.bodyMarkdown, {
    ...runtime,
    // Korean ranges like "15~17개" use a single tilde; GFM would read a pair of them as strikethrough.
    remarkPlugins: [[remarkGfm, { singleTilde: false }]],
  });
  return (
    <div className="prose-article">
      <Content components={{ ...componentsFor(article), blockquote: EditorialQuote, pre: CodeBlock, table: ScrollTable }} />
    </div>
  );
}

function CodeBlock({ children, ...props }: ComponentProps<"pre">) {
  const language = isValidElement<ComponentProps<"code">>(children)
    ? children.props.className?.match(/\blanguage-(\S+)/)?.[1]
    : undefined;

  return (
    <figure className="not-prose my-8 min-w-0 border border-[#414143] bg-[#202021] text-[#f5f5f4]">
      {language && (
        <figcaption className="border-b border-[#414143] px-4 py-2 font-mono text-xs tracking-wider text-[#b8b8b8] uppercase">
          {language}
        </figcaption>
      )}
      <pre {...props} className="overflow-x-auto px-4 py-3 font-mono text-sm leading-relaxed">{children}</pre>
    </figure>
  );
}

/** A wide table scrolls on its own so a phone never scrolls the whole page sideways. */
function ScrollTable(props: ComponentProps<"table">) {
  return (
    <div className="table-scroll">
      <table {...props} />
    </div>
  );
}
