import { Children, isValidElement, type ReactElement, type ReactNode } from "react";

type LayerProps = { name: string; detail?: string };

/** Data carrier only: <Pyramid> reads its props ({@link LayerProps}) and draws it. */
export function PyramidLayer(): null {
  return null;
}

/**
 * Stacked bars that narrow layer by layer. "inverted" puts the widest layer on top,
 * "upright" the narrowest. Layers are written top to bottom in both cases.
 */
export function Pyramid({
  shape,
  title,
  caption,
  children,
}: {
  shape: "inverted" | "upright";
  title?: string;
  caption?: string;
  children: ReactNode;
}) {
  const layers = Children.toArray(children)
    .filter((c): c is ReactElement<LayerProps> => isValidElement(c) && c.type === PyramidLayer)
    .map((c) => c.props);
  const n = layers.length;

  return (
    <figure className="not-prose my-10">
      {title && <p className="mb-4 text-[13px] font-medium text-muted">{title}</p>}
      <ol className="flex flex-col items-center gap-1.5">
        {layers.map((layer, i) => {
          // 0 at the widest layer, 1 at the narrowest.
          const t = n > 1 ? (shape === "inverted" ? i : n - 1 - i) / (n - 1) : 0;
          const ink = Math.round(88 - t * 70);
          const dark = ink >= 50;
          return (
            <li
              key={i}
              className="rounded-xl px-4 py-3 text-center"
              style={{
                width: `${Math.round(100 - t * 48)}%`,
                background: `color-mix(in srgb, var(--foreground) ${ink}%, var(--background))`,
                color: dark ? "var(--background)" : "var(--foreground)",
              }}
            >
              <span className="block text-[15px] leading-snug font-semibold">
                <span className="mr-1.5 tabular-nums opacity-60">{String(i + 1).padStart(2, "0")}</span>
                {layer.name}
              </span>
              {layer.detail && <span className="mt-0.5 block text-[13px] leading-snug opacity-75">{layer.detail}</span>}
            </li>
          );
        })}
      </ol>
      {caption && <figcaption className="mt-3 text-center text-[13px] text-muted">{caption}</figcaption>}
    </figure>
  );
}
