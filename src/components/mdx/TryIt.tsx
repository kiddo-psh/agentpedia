import { CopyButton } from "@/components/CopyButton";

export function TryIt({ prompt }: { prompt: string }) {
  return (
    <div className="not-prose my-8 overflow-hidden rounded-xl border border-foreground/15">
      <div className="flex items-center justify-between gap-3 border-b border-foreground/10 bg-foreground/[.03] px-4 py-2">
        <span className="text-sm font-semibold">▶ 직접 해보기</span>
        <CopyButton text={prompt} label="프롬프트 복사" />
      </div>
      <p className="whitespace-pre-wrap px-4 py-3 font-mono text-sm leading-relaxed">{prompt}</p>
    </div>
  );
}
