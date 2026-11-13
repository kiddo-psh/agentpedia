import { CopyButton } from "@/components/CopyButton";
import { DIFFICULTY_LABEL, formatMonth, newestPublished } from "@/content/labels";
import type { Article } from "@/content/schema";
import { applyCommand } from "@/mcp/name";

/** Sticky on wide screens so the one action the site exists for stays in reach while reading. */
export function ApplyRail({ article, sections }: { article: Article; sections: [id: string, label: string][] }) {
  const command = applyCommand(article.slug);
  return (
    <aside className="sticky top-24 self-start max-xl:hidden" aria-label="이 글 적용하기">
      <div className="rounded-2xl p-5 ring-1 ring-line ring-inset">
        <h2 className="font-semibold">내 레포에 적용</h2>
        <p className="mt-1 text-[13.5px] text-muted">에이전트에서 한 줄로 실행합니다.</p>
        <pre className="mt-4 rounded-xl bg-soft px-3.5 py-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap">
          {command}
        </pre>
        <CopyButton text={command} label="명령 복사" look="primary" />
        <CopyButton text={article.tryIt} label="진단 프롬프트 복사" look="secondary" />
        <dl className="mt-5 text-[13.5px]">
          {[
            ["난이도", DIFFICULTY_LABEL[article.difficulty]],
            ["적용 시간", article.apply.time],
            ["출처 시점", formatMonth(newestPublished(article.sources))],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-t border-line py-2.5">
              <dt className="text-muted">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <nav className="mt-7 text-[13.5px]" aria-label="이 글의 차례">
        <h2 className="mb-2 text-xs font-medium text-muted">이 글</h2>
        {sections.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="block py-1.5 pl-3 text-muted shadow-[inset_1px_0_var(--line)] hover:text-foreground hover:shadow-[inset_2px_0_var(--foreground)]"
          >
            {label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
