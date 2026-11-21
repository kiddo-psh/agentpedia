/** Horizontal bar chart for sourced numeric series. Pure SVG, no chart library. */

export type BarDatum = {
  id: string;
  label: string;
  value: number;
  href?: string;
  detail?: string;
};

export function BarChart({
  title,
  unit,
  data,
  format = (value) => String(value),
}: {
  title: string;
  unit: string;
  data: BarDatum[];
  format?: (value: number) => string;
}) {
  if (data.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="mt-2 text-sm text-muted">확인한 값이 없습니다.</p>
      </div>
    );
  }

  const max = Math.max(...data.map((row) => row.value), Number.EPSILON);

  return (
    <div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted">{unit}</p>
      <ul className="models-barchart mt-4" aria-label={title}>
        {data.map((row, index) => {
          const ratio = Math.max(0.04, row.value / max);
          const label = (
            <span className="models-barchart-label truncate text-[13px]">{row.label}</span>
          );
          return (
            <li
              key={row.id}
              className="models-barchart-row"
              style={{ ["--bar" as string]: String(ratio), ["--i" as string]: String(index) }}
            >
              {row.href ? (
                <a href={row.href} className="models-barchart-label-link hover:text-foreground">
                  {label}
                </a>
              ) : (
                label
              )}
              <span className="models-barchart-track" aria-hidden>
                <span className="models-barchart-fill" />
              </span>
              <span className="models-barchart-value tabular-nums text-[13px]">
                {format(row.value)}
                {row.detail ? ` · ${row.detail}` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
