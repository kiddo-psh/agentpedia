import localFont from "next/font/local";

// Same face as `geist/font/mono`, minus its default preload. Chrome holds first paint for a
// preloaded font, so this 70 KB code font delayed every page (about 0.15 s LCP on /connect under
// slow 4G, docs/perf/2026-11-14-first-paint.md).
export const geistMono = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  preload: false,
  adjustFontFallback: false,
});
