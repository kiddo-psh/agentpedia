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
  const height = data.length * 44 + 8;

  return (
    <div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted">{unit}</p>
      <svg
        role="img"
        aria-label={title}
        viewBox={`0 0 720 ${height}`}
        className="mt-4 w-full max-w-[720px] overflow-visible text-foreground"
      >
        {data.map((row, index) => {
          const y = index * 44 + 4;
          const width = Math.max(4, (row.value / max) * 420);
          return (
            <g key={row.id}>
              <text x={0} y={y + 18} fill="currentColor" fontSize={13}>
                {row.label}
              </text>
              <rect x={180} y={y + 4} width={width} height={22} fill="currentColor" opacity={0.8} rx={2} />
              <text x={180 + width + 10} y={y + 19} fill="currentColor" fontSize={13}>
                {format(row.value)}
                {row.detail ? ` · ${row.detail}` : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
