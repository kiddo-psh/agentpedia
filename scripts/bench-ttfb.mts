/**
 * Measures time-to-first-byte and time-to-last-byte for each route against a running server.
 * Usage: tsx scripts/bench-ttfb.mts [baseUrl] [runs] > out.json
 */
const base = process.argv[2] ?? "http://localhost:3100";
const runs = Number(process.argv[3] ?? 30);
const WARMUP = 3;

const routes = [
  "/",
  "/connect",
  "/login",
  "/likes",
  "/a/karpathy-software-3",
  "/a/anthropic-harness-design-long-running-apps",
  "/a/theo-coding-isnt-about-code-anymore",
];

async function once(url: string) {
  const t0 = performance.now();
  const res = await fetch(url, { redirect: "manual", headers: { "accept-encoding": "gzip" } });
  const reader = res.body!.getReader();
  let first = 0;
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!first) first = performance.now();
    bytes += value.byteLength;
  }
  const end = performance.now();
  return {
    status: res.status,
    cache: res.headers.get("x-nextjs-cache") ?? res.headers.get("x-nextjs-prerender") ?? "",
    ttfb: (first || end) - t0,
    total: end - t0,
    bytes,
  };
}

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return +s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))].toFixed(1);
};

const results = [];
for (const route of routes) {
  const url = base + route;
  for (let i = 0; i < WARMUP; i++) await once(url);
  const samples = [];
  for (let i = 0; i < runs; i++) samples.push(await once(url));
  const ttfb = samples.map((s) => s.ttfb);
  const total = samples.map((s) => s.total);
  results.push({
    route,
    status: samples[0].status,
    cache: samples[0].cache,
    bytes: samples[0].bytes,
    runs,
    ttfb: { p50: pct(ttfb, 50), p90: pct(ttfb, 90), min: pct(ttfb, 0), max: pct(ttfb, 100) },
    total: { p50: pct(total, 50), p90: pct(total, 90), min: pct(total, 0), max: pct(total, 100) },
  });
  console.error(`${route} ttfb p50 ${results.at(-1)!.ttfb.p50}ms total p50 ${results.at(-1)!.total.p50}ms`);
}
console.log(JSON.stringify({ base, measuredAt: new Date().toISOString(), results }, null, 2));
