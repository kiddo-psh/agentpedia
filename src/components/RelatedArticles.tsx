import Link from "next/link";
import { CATEGORY_LABEL } from "@/content/labels";
import type { RelatedGraph, SharedSignal } from "@/content/related";

const W = 320;
const H = 150;
const CENTER = { x: W / 2, y: H / 2 };

/** Neighbours sit on an ellipse around the current article, the first one on the left. */
function position(i: number, n: number) {
  const angle = Math.PI + (2 * Math.PI * i) / n;
  return { x: CENTER.x + 120 * Math.cos(angle), y: CENTER.y + 52 * Math.sin(angle) };
}

/** A tag and a glossary term often name the same thing ("mcp" and "MCP"); show it once. */
function sharedLabels(shared: SharedSignal[]) {
  const seen = new Map(shared.map((s) => [s.label.toLowerCase(), s.label]));
  return [...seen.values()].join(", ");
}

/** A small server-rendered map of the closest articles, with the same list in text below it. */
export function RelatedArticles({ graph }: { graph: RelatedGraph }) {
  const { related, edges } = graph;
  if (related.length === 0) return null;
  const at = new Map(related.map((r, i) => [r.slug, position(i, related.length)]));

  return (
    <section id="related" aria-labelledby="related-title" className="mt-24 scroll-mt-24">
      <h2 id="related-title" className="mb-5 text-[22px] font-semibold tracking-tight">
        관련 기사
      </h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto mb-8 block w-full max-w-md" aria-hidden>
        <g className="stroke-foreground/20" strokeWidth={1}>
          {related.map((r) => (
            <line key={r.slug} x1={CENTER.x} y1={CENTER.y} x2={at.get(r.slug)!.x} y2={at.get(r.slug)!.y} />
          ))}
          {edges.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={at.get(a)!.x} y1={at.get(a)!.y} x2={at.get(b)!.x} y2={at.get(b)!.y} strokeDasharray="3 3" />
          ))}
        </g>
        <circle cx={CENTER.x} cy={CENTER.y} r={17} className="fill-accent" />
        <text x={CENTER.x} y={CENTER.y} dy="0.35em" textAnchor="middle" className="fill-background text-[9px] font-semibold">
          이 글
        </text>
        {related.map((r, i) => {
          const p = at.get(r.slug)!;
          return (
            <a key={r.slug} href={`/a/${r.slug}`} tabIndex={-1}>
              <title>{r.title}</title>
              <circle cx={p.x} cy={p.y} r={13} className="fill-background stroke-accent" strokeWidth={1.5} />
              <text x={p.x} y={p.y} dy="0.35em" textAnchor="middle" className="fill-accent text-[11px] font-semibold">
                {i + 1}
              </text>
            </a>
          );
        })}
      </svg>
      <ol className="grid gap-3 text-sm">
        {related.map((r, i) => (
          <li key={r.slug} className="flex gap-3">
            <span
              aria-hidden
              className="grid size-6 shrink-0 place-items-center rounded-full border border-accent text-xs font-semibold text-accent"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <Link href={`/a/${r.slug}`} className="font-medium leading-snug underline-offset-2 hover:underline">
                {r.title}
              </Link>
              <p className="mt-0.5 text-muted">
                {CATEGORY_LABEL[r.category]}
                {r.shared.length > 0 && <> · 공통: {sharedLabels(r.shared)}</>}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
