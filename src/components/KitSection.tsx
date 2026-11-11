import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { McpSnippet } from "@/components/McpEndpoint";
import { SERVER_NAME } from "@/mcp/name";
import { orderedKit } from "@/content/kit";
import { REQUIRED_KIT_FILE, type Article } from "@/content/schema";

export function KitSection({ article }: { article: Article }) {
  const files = orderedKit(article.kit);

  return (
    <section
      id="kit"
      className="mt-16 rounded-2xl border border-accent/30 bg-accent/[.04] p-6 sm:p-8"
      aria-labelledby="kit-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="kit-title" className="text-xl font-bold">
            내 프로젝트에 적용하기
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            에이전트에게 <code className="font-mono">{REQUIRED_KIT_FILE}</code>를 건네고 진행하게 하세요. 끝나면{" "}
            <code className="font-mono">checklist.md</code>로 점검합니다.
          </p>
        </div>
        <a
          href={`/a/${article.slug}/kit`}
          download
          className="shrink-0 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
        >
          키트 다운로드 (.zip)
        </a>
      </div>

      <ApplySummary apply={article.apply} />

      <div className="mt-6">
        <p className="text-sm font-semibold">에이전트에서 바로 적용하기</p>
        <McpSnippet
          template={`/mcp__${SERVER_NAME}__apply_article ${article.slug}`}
          label="Claude Code 안에서"
        />
        <p className="text-xs text-muted">
          처음이라면{" "}
          <Link href="/connect" className="underline underline-offset-2">
            에이전트 연결 방법
          </Link>
          을 먼저 확인하세요.
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        {files.map((f) => (
          <details
            key={f.path}
            open={f.path === REQUIRED_KIT_FILE}
            className="group overflow-hidden rounded-xl border border-foreground/10 bg-background"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
              <span className="font-mono text-sm">
                <span className="mr-2 inline-block text-muted transition-transform group-open:rotate-90">▸</span>
                {f.path}
              </span>
              <CopyButton text={f.content} />
            </summary>
            <pre className="max-h-96 overflow-auto border-t border-foreground/10 bg-foreground/[.03] px-4 py-3 font-mono text-[0.8rem] leading-relaxed whitespace-pre-wrap">
              {f.content}
            </pre>
          </details>
        ))}
      </div>
    </section>
  );
}

/** What the kit will do, stated before the reader runs anything. */
function ApplySummary({ apply }: { apply: Article["apply"] }) {
  return (
    <div className="mt-6 rounded-xl bg-background p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">이 키트가 하는 일</p>
      <p className="mt-1 text-lg font-semibold leading-snug">{apply.goal}</p>
      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className="mb-1 font-semibold">바뀔 수 있는 것</p>
          <ul className="grid gap-1">
            {apply.changes.map((c) => (
              <li key={c} className="flex gap-2">
                <span className="text-accent">+</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 font-semibold">하지 않는 것</p>
          <ul className="grid gap-1 text-muted">
            {apply.doesNotDo.map((c) => (
              <li key={c} className="flex gap-2">
                <span>−</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <dl className="mt-4 grid gap-1 border-t border-foreground/10 pt-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
        <dt className="text-muted">이런 프로젝트에 맞아요</dt>
        <dd>{apply.fitsWhen}</dd>
        <dt className="text-muted">예상 시간</dt>
        <dd>{apply.time}</dd>
      </dl>
      <p className="mt-3 text-xs text-muted">
        에이전트는 먼저 레포를 읽고 맞지 않으면 멈춥니다. 파일을 바꾸기 전에는 항상 계획을 보여주고 승인을 받습니다.
      </p>
    </div>
  );
}
