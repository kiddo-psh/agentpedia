import Link from "next/link";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/CopyButton";
import { McpSnippet } from "@/components/McpEndpoint";
import { orderedKit } from "@/content/kit";
import type { Article } from "@/content/schema";
import { applyCommand } from "@/mcp/name";

/**
 * Two steps stay open: diagnose, then apply. What the kit changes and the kit files
 * fold away so the section reads as one goal and two actions.
 */
export function KitSection({ article }: { article: Article }) {
  const { apply } = article;
  const files = orderedKit(article.kit);

  return (
    <section id="kit" className="mt-24 scroll-mt-24" aria-labelledby="kit-title">
      <h2 id="kit-title" className="text-[28px] font-semibold tracking-tight">
        내 프로젝트에 적용하기
      </h2>
      <p className="mt-3 text-lg leading-relaxed">{apply.goal}</p>
      <p className="mt-2 text-sm text-muted">
        {apply.time} · {apply.fitsWhen}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        키트는 코딩 에이전트에게 건네는 작업 지시문(<code className="font-mono">prompt.md</code>)과 점검표(
        <code className="font-mono">checklist.md</code>) 묶음입니다.
      </p>

      <ol className="mt-8 border-b border-line">
        <Step n={1} title="내 레포에 맞는지 진단하기" note="파일을 바꾸지 않습니다">
          <div className="rounded-xl bg-soft">
            <div className="flex items-center justify-between gap-3 px-4 pt-3">
              <span className="text-xs font-medium text-muted">아무 코딩 에이전트에나 붙여 넣으세요</span>
              <CopyButton text={article.tryIt} label="프롬프트 복사" />
            </div>
            <p className="px-4 pt-2 pb-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">{article.tryIt}</p>
          </div>
        </Step>

        <Step n={2} title="적용하기" note="바꾸기 전에 계획을 보여 주고 승인을 받습니다">
          <McpSnippet template={applyCommand(article.slug)} label="Claude Code에서" />
          <p className="text-sm leading-relaxed text-muted">
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
      </ol>

      <div className="mt-6 grid gap-2">
        <Fold title="키트가 바꾸는 것과 하지 않는 것">
          <ul className="grid gap-1.5">
            {apply.changes.map((c) => (
              <li key={c} className="flex gap-2.5">
                <span className="font-mono">+</span>
                <span>{c}</span>
              </li>
            ))}
            {apply.doesNotDo.map((c) => (
              <li key={c} className="flex gap-2.5 text-muted">
                <span className="font-mono">−</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </Fold>
        <Fold title={`키트 파일 보기 (${files.length}개)`}>
          <div className="grid gap-5">
            {files.map((f) => (
              <div key={f.path} className="min-w-0">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="font-mono">{f.path}</span>
                  <CopyButton text={f.content} />
                </div>
                <pre className="max-h-80 overflow-auto rounded-xl bg-background px-4 py-3 font-mono text-[0.8rem] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
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
    <li className="grid gap-x-4 border-t border-line py-6 sm:grid-cols-[40px_minmax(0,1fr)]">
      <span className="pt-0.5 font-mono text-[13px] text-muted">{String(n).padStart(2, "0")}</span>
      <div className="min-w-0">
        <h3 className="text-[17px] font-semibold">
          {title} <span className="text-sm font-normal text-muted">· {note}</span>
        </h3>
        <div className="mt-3">{children}</div>
      </div>
    </li>
  );
}

function Fold({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl bg-soft text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 font-medium">
        <span className="inline-block text-muted transition-transform group-open:rotate-90">▸</span>
        {title}
      </summary>
      <div className="border-t border-line px-5 py-4">{children}</div>
    </details>
  );
}
