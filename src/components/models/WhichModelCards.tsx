import Link from "next/link";
import type { WhichPick } from "./metrics";

export function WhichModelCards({ picks }: { picks: WhichPick[] }) {
  if (picks.length === 0) return null;
  return (
    <section className="mt-14" aria-labelledby="which-title">
      <h2 id="which-title" className="text-[22px] font-semibold tracking-tight">
        어떤 모델을 고를까
      </h2>
      <ul className="mt-6 grid gap-6 sm:grid-cols-3">
        {picks.map((pick) => (
          <li key={pick.kind} className="border-t border-line pt-4">
            <p className="text-[13px] font-medium text-muted">{pick.title}</p>
            <Link href={pick.href} prefetch={true} className="mt-2 block text-lg font-medium hover:underline">
              {pick.name}
            </Link>
            <p className="mt-1 tabular-nums text-sm">{pick.detail}</p>
            <p className="mt-3 text-[12px] leading-relaxed text-muted">{pick.rule}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
