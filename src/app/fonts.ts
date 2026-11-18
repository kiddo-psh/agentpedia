import localFont from "next/font/local";

// Same face as `geist/font/mono`, minus its default preload. Not applied from the root layout:
// DeferredMonoFont loads it only when #kit / pre / code nears the viewport so first paint does
// not request the ~70 KB file (docs/perf/2026-11-14-first-paint.md).
export const geistMono = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  preload: false,
  adjustFontFallback: false,
  display: "swap",
});
