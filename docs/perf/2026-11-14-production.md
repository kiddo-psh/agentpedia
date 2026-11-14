# Production measurement (2026-11-14)

`https://agentpedia-flax.vercel.app`, build `ac8159a`, measured from Seoul. The deploy was
confirmed live: the Geist Mono preload is gone from the article HTML.

## Server: shell from the edge, the rest from iad1

`scripts/bench-ttfb.mts`, 20 runs per route, logged out (`2026-11-14-prod-ttfb.json`):

| Route | TTFB p50 (ms) | Total p50 (ms) |
|---|---|---|
| `/` | 40 | 41 |
| `/connect` | 38 | 38 |
| `/likes` | 45 | 267 |
| karpathy article | 44 | 805 |
| harness article | 41 | 838 |
| theo article | 42 | 846 |

Responses carry `x-vercel-id: icn1::iad1::…`: the Seoul edge serves the prerendered shell, and
the function runs in iad1 (US East). Chunk timing on the karpathy article, warm:

- 35-39 ms: the 45 KB shell, article HTML included (`</article>` is in it).
- 590-620 ms: the first resumed chunk, with the Suspense reveal for likes and comments.
- 770-800 ms: the end of about 130 KB of inline RSC payload.

On the first request after the deploy, even the shell waited 2.3 s and the stream ended at 3.1 s.
That looks like a cold function holding the shell, and it happened once in this session.

## Browser: first layout, not the network

`scripts/bench-vitals.mts`, Slow 4G and 4x CPU, median of five:

| Route | FCP = LCP (s) | Local build, same harness (s) |
|---|---|---|
| `/` | 2.33 | |
| `/connect` | 1.68 | 1.48-1.55 |
| karpathy article | 3.34 | 2.57-2.77 |
| harness article | 3.44 | 2.62-2.88 |

On an article, the HTML and the only render-blocking CSS finish at about 1.0 s. A trace shows the
first layout starting at 0.9 s and running 2.2 s for 401 layout objects. Each font subset that
arrives later triggers another full layout of about 0.7 s.

What the layout is not:

- Fonts: blocking every `.woff2` moves article FCP only from 3.56 s to 3.05 s.
- Korean fallback lookup: forcing `Malgun Gothic` or Arial on every element leaves the first
  layout at 1.5-1.8 s.
- `word-break: keep-all` on `body`: turning it off changes nothing.

The article has about 11,400 characters of text, and the first layout shapes all of it,
off-screen text included.

## Lead: `content-visibility: auto` below the fold

This CSS was injected before first layout (`INJECT_CSS`) against production, alternating with
the unchanged page for three rounds of three loads:

```css
.prose-article > *, article > section, aside {
  content-visibility: auto;
  contain-intrinsic-size: auto 600px;
}
```

| Route | Unchanged LCP (s) | Injected LCP (s) |
|---|---|---|
| karpathy article | 3.18, 3.20, 3.27 | 1.98, 1.89, 1.88 |
| harness article | 3.23, 3.43, 3.50 | 1.94, 1.87, 1.93 |

The largest layout fell from about 2.0 s to 1.1 s. The skipped layout still happens later, when
the reader scrolls. One traced run summed more long-task time after paint (1.6 s against 0.5 s),
so scroll smoothness and anchor jumps to `#comments` need a check before this ships.

## Caveats

- Everything here is headless Chrome on Windows with simulated throttling. A real phone may lay
  text out at a different cost.
- The comparison against the previous deploy was not made. Vercel's per-deploy URLs were not
  tried, so production has no before number for the font and Suspense changes.
