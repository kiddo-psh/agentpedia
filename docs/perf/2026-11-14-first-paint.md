# First paint on article pages (2026-11-14)

Local production build, headless Chrome through `scripts/bench-vitals.mts`: Lighthouse's
Slow 4G profile (150 ms RTT, 1.6 Mbps down), 4x CPU slowdown, 412x823 mobile viewport,
cache disabled.

## Where the time went

On the harness article, FCP and LCP were both about 3 s, while the HTML arrived at about
0.6 s. A Chrome trace showed why.

- `GeistMono_Variable` (70 KB) was preloaded on every page through the root layout, because
  `geist/font/mono` calls `next/font/local` with the default `preload: true`. Chrome holds first
  paint for a preloaded font. With it blocked, FCP fell from 2.7-3.4 s to 1.2-1.3 s.
- The article sat behind the `params` Suspense boundary. The shell painted a skeleton, then
  React revealed the article about 300 ms later (its reveal throttle) and laid the page out a
  second time.
- First layout of the article is expensive in this setup: 286 ms at 1x CPU, 1.4-2.2 s at 4x.
  Even `/connect` takes about 1 s at 4x, so much of it looks like fixed headless-Chrome font
  setup. Pretendard is not the cause: a system font gave the same LCP.

Dropping only the preload moved FCP to about 1.1 s but made LCP about 0.3 s worse, because the
skeleton-then-reveal step now ran after first paint. The two changes only help together.

## Result

Current master (A) against both changes (C), one server at a time on port 3217, alternated for
four rounds. Each cell is the median of three loads. Each round checked the `Link` header to
confirm which build answered, and the server log had no errors.

| Route | A: LCP (s) | C: LCP (s) | Median change |
|---|---|---|---|
| harness article | 2.84, 2.98, 2.94, 3.18 | 2.73, 2.82, 2.62, 2.88 | -0.19 s |
| karpathy article | 2.87, 2.79, 2.56, 2.97 | 2.73, 2.64, 2.57, 2.77 | -0.15 s |
| `/connect` | 1.65, 1.66, 1.68, 1.67 | 1.55, 1.52, 1.48, 1.50 | -0.16 s |

FCP equals LCP in both builds. C was faster in 11 of 12 rounds. `/connect` only gets the font
change, so the preload alone is worth about 0.15 s on every page.

Client navigation from `/` to an article, measured as click to `article h1`, was unchanged:
1.34-1.82 s before and 1.56-1.74 s after. The skeleton that used to show during that wait is
gone. Server CPU per article request stayed at 36-45 ms.

## Measurement traps hit on the way

- Three servers on one PGlite folder corrupted it. Every request then retried the database
  connect and cost 445 ms of CPU. The browser numbers taken during that time were discarded.
- With `MSYS_NO_PATHCONV=1` set, `taskkill //PID` does not stop the process. A new server then
  fails with `EADDRINUSE` and the old one keeps answering. Check which build answers.
- A longtask observer registered after load misses the early long tasks, so TBT from the page
  is not usable here. Read long tasks from a trace instead.
