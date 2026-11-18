import { evaluate } from "@mdx-js/mdx";
import type { ComponentProps } from "react";
import { isValidElement } from "react";
import * as runtime from "react/jsx-runtime";
import rehypeHighlight from "rehype-highlight";
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
    rehypePlugins: [rehypeHighlight],
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
    <figure className="article-code not-prose my-8 min-w-0 overflow-hidden rounded-md border border-[#454545] bg-[#1e1e1e] text-[#d4d4d4]">
      <figcaption className="flex border-b border-[#353535] bg-[#252526]">
        <span className="inline-flex items-center gap-2 border-t-2 border-r border-t-[#007acc] border-r-[#353535] bg-[#1e1e1e] px-4 py-1.5 font-mono text-xs">
          <span aria-hidden="true" className="select-none text-[#75beff]">&lt;/&gt;</span>
          {language ?? "Plain text"}
        </span>
      </figcaption>
      <pre {...props} className="overflow-x-auto px-4 py-4 font-mono text-sm leading-6 [tab-size:4]">{children}</pre>
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
