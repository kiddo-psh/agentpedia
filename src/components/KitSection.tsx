import Link from "next/link";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/CopyButton";
import { McpSnippet } from "@/components/McpEndpoint";
import { SERVER_NAME } from "@/mcp/name";
import { orderedKit } from "@/content/kit";
import type { Article } from "@/content/schema";

/**
 * Two steps stay open: diagnose, then apply. What the kit changes and the kit files
 * fold away so the section reads as one goal and two actions.
 */
export function KitSection({ article }: { article: Article }) {
  const { apply } = article;
  const files = orderedKit(article.kit);

  return (
    <section
      id="kit"
      className="mt-16 rounded-2xl border border-accent/30 bg-accent/[.04] p-6 sm:p-8"
      aria-labelledby="kit-title"
    >
      <h2 id="kit-title" className="text-xl font-bold">
        내 프로젝트에 적용하기
      </h2>
      <p className="mt-2 text-sm text-muted">
        키트는 코딩 에이전트에게 건네는 작업 지시문(<code className="font-mono">prompt.md</code>)과 점검표(
        <code className="font-mono">checklist.md</code>) 묶음입니다. 이 글의 키트는 다음 일을 합니다.
      </p>
      <p className="mt-3 leading-relaxed">{apply.goal}</p>
      <p className="mt-1 text-sm text-muted">
        {apply.time} · {apply.fitsWhen}
      </p>

      <Step n={1} title="내 레포에 맞는지 진단하기" note="파일을 바꾸지 않습니다">
        <div className="overflow-hidden rounded-xl border border-foreground/15 bg-background">
          <div className="flex items-center justify-between gap-3 border-b border-foreground/10 bg-foreground/[.03] px-4 py-2">
            <span className="text-xs font-medium text-muted">아무 코딩 에이전트에나 붙여 넣으세요</span>
            <CopyButton text={article.tryIt} label="프롬프트 복사" />
          </div>
          <p className="whitespace-pre-wrap px-4 py-3 font-mono text-sm leading-relaxed">{article.tryIt}</p>
        </div>
      </Step>

      <Step n={2} title="적용하기" note="바꾸기 전에 계획을 보여 주고 승인을 받습니다">
        <McpSnippet template={`/mcp__${SERVER_NAME}__apply_article ${article.slug}`} label="Claude Code에서" />
        <p className="text-sm text-muted">
          MCP를 쓰지 않는다면{" "}
          <a href={`/a/${article.slug}/kit`} download className="font-medium text-foreground underline underline-offset-2">
            키트(.zip)
          </a>
          를 받아 에이전트에게 <code className="font-mono">prompt.md</code>를 건네세요. 처음이라면{" "}
          <Link href="/connect" className="underline underline-offset-2">
            에이전트 연결 방법
          </Link>
          을 보세요.
        </p>
      </Step>

      <div className="mt-6 grid gap-2">
        <Fold title="키트가 바꾸는 것과 하지 않는 것">
          <ul className="grid gap-1">
            {apply.changes.map((c) => (
              <li key={c} className="flex gap-2">
                <span className="text-accent">+</span>
                <span>{c}</span>
              </li>
            ))}
            {apply.doesNotDo.map((c) => (
              <li key={c} className="flex gap-2 text-muted">
                <span>−</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </Fold>
        <Fold title={`키트 파일 보기 (${files.length}개)`}>
          <div className="grid gap-4">
            {files.map((f) => (
              <div key={f.path}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="font-mono">{f.path}</span>
                  <CopyButton text={f.content} />
                </div>
                <pre className="max-h-80 overflow-auto rounded-lg bg-foreground/[.04] px-3 py-2 font-mono text-[0.8rem] leading-relaxed whitespace-pre-wrap">
                  {f.content}
                </pre>
              </div>
            ))}
          </div>
        </Fold>
      </div>
    </section>
  );
}

function Step({ n, title, note, children }: { n: number; title: string; note: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      <p className="mb-2 text-sm font-semibold">
        <span className="mr-2 font-mono text-accent">{n}</span>
        {title} <span className="font-normal text-muted">· {note}</span>
      </p>
      {children}
    </div>
  );
}

function Fold({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-foreground/10 bg-background text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-medium">
        <span className="inline-block text-muted transition-transform group-open:rotate-90">▸</span>
        {title}
      </summary>
      <div className="border-t border-foreground/10 px-4 py-3">{children}</div>
    </details>
  );
}
