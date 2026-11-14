/**
 * Loads pages in headless Chrome under mobile-like throttling and prints FCP, LCP and bytes.
 * Usage: tsx scripts/bench-vitals.mts [baseUrl] [runs] [route...] > out.json
 * CHROME_PATH overrides the browser; defaults to the standard Windows Chrome install.
 *
 * Run-to-run spread is wide (LCP can move 0.5 s between runs), so compare builds by alternating
 * them in rounds, and check which build answers before trusting a round.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [base = "http://localhost:3217", runsArg = "5", ...routeArgs] = process.argv.slice(2);
const runs = Number(runsArg);
const routes = routeArgs.length > 0 ? routeArgs : ["/", "/a/karpathy-software-3", "/a/anthropic-harness-design-long-running-apps"];
const chrome = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

// Lighthouse's "Slow 4G" mobile profile: 150 ms RTT, 1.6 Mbps down, 750 Kbps up, 4x CPU slowdown.
const NETWORK = { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 };
const CPU_RATE = 4;
// BLOCK_URLS="*Pretendard*,*.woff2" blocks matching requests, to attribute cost to a resource.
const BLOCK = (process.env.BLOCK_URLS ?? "").split(",").filter(Boolean);
// INJECT_CSS="..." adds a stylesheet before the first layout, to try a CSS change without a rebuild.
const INJECT_CSS = process.env.INJECT_CSS;

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "bench-vitals-"));
const proc = spawn(chrome, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profileDir}`, "--no-first-run", "about:blank"], {
  stdio: ["ignore", "ignore", "pipe"],
});
const wsUrl = await new Promise<string>((resolve, reject) => {
  let err = "";
  proc.stderr.on("data", (d) => {
    err += d;
    const m = err.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) resolve(m[1]);
  });
  proc.on("exit", () => reject(new Error("chrome exited: " + err)));
});

const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let nextId = 1;
const pending = new Map<number, (v: { result?: unknown; error?: unknown }) => void>();
const listeners: ((m: { method: string; params: unknown; sessionId?: string }) => void)[] = [];
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(String(e.data));
  if (msg.id) pending.get(msg.id)?.(msg);
  else listeners.forEach((l) => l(msg));
});
function send<T = unknown>(method: string, params: object = {}, sessionId?: string): Promise<T> {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params, sessionId }));
  return new Promise((resolve, reject) =>
    pending.set(id, (m) => (m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result as T))),
  );
}

const COLLECT = `new Promise((resolve) => {
  let lcp = 0;
  new PerformanceObserver((l) => { for (const e of l.getEntries()) lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
  setTimeout(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const res = performance.getEntriesByType("resource");
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    resolve({
      ttfb: nav.responseStart, fcp: fcp ? fcp.startTime : null, lcp, load: nav.loadEventEnd,
      htmlKB: nav.encodedBodySize / 1024,
      jsKB: res.filter((r) => r.initiatorType === "script").reduce((s, r) => s + r.encodedBodySize, 0) / 1024,
    });
  }, 1500);
})`;

async function measure(url: string) {
  const { targetId } = await send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send<{ sessionId: string }>("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Network.enable", {}, sessionId);
  await send("Network.setCacheDisabled", { cacheDisabled: true }, sessionId);
  await send("Network.emulateNetworkConditions", NETWORK, sessionId);
  await send("Emulation.setCPUThrottlingRate", { rate: CPU_RATE }, sessionId);
  if (BLOCK.length > 0) await send("Network.setBlockedURLs", { urls: BLOCK }, sessionId);
  if (INJECT_CSS) {
    await send("Page.addScriptToEvaluateOnNewDocument", {
      // Insert as soon as <head> exists, before the first layout, and keep it last in <head>.
      source: `new MutationObserver((_, obs) => { if (!document.head || !document.body) return; const s = document.createElement("style"); s.textContent = ${JSON.stringify(INJECT_CSS)}; document.body.prepend(s); obs.disconnect(); }).observe(document, { childList: true, subtree: true });`,
    }, sessionId);
  }
  await send("Emulation.setDeviceMetricsOverride", { width: 412, height: 823, deviceScaleFactor: 2, mobile: true }, sessionId);
  const loaded = new Promise<void>((resolve) => {
    const l = (m: { method: string; sessionId?: string }) => {
      if (m.method === "Page.loadEventFired" && m.sessionId === sessionId) resolve();
    };
    listeners.push(l);
  });
  await send("Page.navigate", { url }, sessionId);
  await loaded;
  const { result } = await send<{ result: { value: Record<string, number> } }>(
    "Runtime.evaluate",
    { expression: COLLECT, awaitPromise: true, returnByValue: true },
    sessionId,
  );
  await send("Target.closeTarget", { targetId });
  return result.value;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return Math.round(s[Math.floor(s.length / 2)]);
};

const out: unknown[] = [];
for (const route of routes) {
  await measure(base + route);
  const samples: Record<string, number>[] = [];
  for (let i = 0; i < runs; i++) samples.push(await measure(base + route));
  const keys = ["ttfb", "fcp", "lcp", "load", "htmlKB", "jsKB"] as const;
  const row = Object.fromEntries(keys.map((k) => [k, median(samples.map((s) => s[k]))]));
  const spread = Object.fromEntries(
    (["fcp", "lcp"] as const).map((k) => [k, [Math.round(Math.min(...samples.map((s) => s[k]))), Math.round(Math.max(...samples.map((s) => s[k])))]]),
  );
  out.push({ route, runs, median: row, range: spread });
  console.error(route, JSON.stringify(row));
}
console.log(JSON.stringify({ base, network: "slow-4g", cpuRate: CPU_RATE, measuredAt: new Date().toISOString(), results: out }, null, 2));
ws.close();
proc.kill();
