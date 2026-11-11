import { CopyButton } from "@/components/CopyButton";
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
