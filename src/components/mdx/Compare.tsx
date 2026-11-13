export function Compare({ before, after }: { before: string; after: string }) {
  return (
    <div className="not-prose my-10 grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl bg-soft p-6">
        <p className="mb-2 text-[13px] font-medium text-muted">이전</p>
        <p className="leading-relaxed">{before}</p>
      </div>
      <div className="rounded-2xl bg-foreground p-6 text-background">
        <p className="mb-2 text-[13px] font-medium opacity-60">이제</p>
        <p className="leading-relaxed">{after}</p>
      </div>
    </div>
  );
}
