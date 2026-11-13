# Article rendering after the UI rewrite (2026-11-14)

Local Windows, `next build` + in-process server, PGlite, logged out, `BETTER_AUTH_SECRET` set to a
local test value.

## Measure CPU, not wall time, on Windows

`setTimeout(1)` takes 15.6 ms here (p50 of 50; min 0.07, max 16.6). Next stages rendering on
timers, so local wall times snap to that tick: `/` takes 15 ms wall but 3-8 ms server CPU.
Linux timers are about 1 ms, so these wall times do not carry over to production.
`scripts/bench-server-cpu.mts` reports server CPU per request instead.

## Post-UI baseline (wall time, `scripts/bench-ttfb.mts`, p50 of 30, two runs)

Same as before the rewrite within noise: `/` 14-15 ms, articles TTFB 40-49 ms, total 76-93 ms.
Article HTML grew to 178-266 KB.

## What the article spent its time on

A CPU profile of 200 requests to the harness article put 21% of samples under the MDX
`evaluate` call in `ArticleBody`. The article is not in the prerendered HTML: the shell holds
only `ArticleSkeleton`, because `params` is URL data under Partial Prefetching, so the whole
article rendered and compiled its MDX on every request.

## Fix: `"use cache"` on `ArticleView`

Likes and comments read the session, so they move out as pass-through slots. The MDX frame is
gone from the profile after the change.

Server CPU per request, `bench-server-cpu.mts`, 200 requests, three runs each:

| Route | Before (ms) | After (ms) |
|---|---|---|
| harness article | 72.1, 59.5, 64.7 | 40.9, 33.7, 41.5 |
| karpathy article | 60.1, 56.8, 53.7 | 34.5, 37.7, 41.3 |
| `/` (control) | 5.3, 4.7, 8.3 | 3.3, 4.4, 4.2 |

Wall per request moved from 52-60 ms to 35-40 ms. The ranges do not overlap.

## Still open

The prerendered HTML for a listed slug still holds the skeleton, not the article, so each
request still streams the cached article (most of the remaining ~38 ms CPU and the 74% inline
RSC share of the HTML). Getting the article into the shell is the next lever.
