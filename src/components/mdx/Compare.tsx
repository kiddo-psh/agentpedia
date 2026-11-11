export function Compare({ before, after }: { before: string; after: string }) {
  return (
    <div className="not-prose my-8 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-foreground/10 p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">이전</p>
        <p className="leading-relaxed text-muted">{before}</p>
      </div>
      <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">이제</p>
        <p className="leading-relaxed">{after}</p>
      </div>
    </div>
  );
}
