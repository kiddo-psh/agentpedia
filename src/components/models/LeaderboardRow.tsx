import Link from "next/link";
import type { LeaderboardRowData } from "./metrics";

export function LeaderboardRow({
  row,
  index,
}: {
  row: LeaderboardRowData;
  index: number;
}) {
  const rankLabel = row.rank === null ? "—" : String(row.rank);
  const style = { ["--i" as string]: String(index) };
  const body = (
    <>
      <span className="models-rank tabular-nums text-muted" aria-hidden={row.rank === null}>
        {rankLabel}
      </span>
      <span className="models-identity min-w-0">
        <span className="block truncate text-[15px] font-medium tracking-tight sm:text-base">{row.name}</span>
        <span className="mt-0.5 block truncate text-[12px] text-muted sm:text-[13px]">
          {row.vendor}
          {row.detail ? ` · ${row.detail}` : ""}
        </span>
      </span>
      <span className="models-bar-track" aria-hidden>
        {row.bar !== null ? (
          <span className="models-bar-fill" style={{ ["--bar" as string]: String(row.bar) }} />
        ) : (
          <span className="models-bar-empty" />
        )}
      </span>
      <span className="models-value tabular-nums text-right text-[13px] font-medium sm:text-sm">
        {row.display}
      </span>
    </>
  );

  const className =
    "models-row grid items-center gap-x-3 border-t border-line py-3.5 sm:gap-x-4 sm:py-4";

  if (row.href) {
    return (
      <li style={style}>
        <Link href={row.href} prefetch={true} className={`${className} models-row-link`}>
          {body}
        </Link>
      </li>
    );
  }

  return (
    <li className={className} style={style}>
      {body}
    </li>
  );
}
