import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { checkHtmlScripts, type ScriptFailure } from "../src/perf/htmlScripts";

const PAGES = ["/", "/models", "/a/claude-code-code-mode-mcp-is-dead"];
const VIEWPORTS = [
  { name: "mobile", width: 412, height: 823 },
  { name: "desktop", width: 1280, height: 800 },
];

function walkHtml(dir: string, out: string[]) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(abs, out);
    else if (entry.name.endsWith(".html")) out.push(abs);
  }
}

function checkBuiltHtml(): ScriptFailure[] {
  const files: string[] = [];
  walkHtml(path.join(process.cwd(), ".next/server/app"), files);
  if (files.length === 0) {
    throw new Error("No built HTML under .next/server/app. Run npm run build first.");
  }
  const failures: ScriptFailure[] = [];
  for (const file of files) {
    const html = fs.readFileSync(file, "utf8");
    failures.push(...checkHtmlScripts(html, path.relative(process.cwd(), file)));
  }
  return failures;
}

function chromePath(): string {
  const candidates = [
    process.env.CHROME_PATH,
    "/opt/google/chrome/chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter((value): value is string => Boolean(value));
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`Chrome not found. Set CHROME_PATH. Tried ${candidates.join(", ")}`);
  return found;
}

async function waitForServer(url: string) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // server still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Server did not respond at ${url}`);
}

async function main() {
  const htmlFailures = checkBuiltHtml();
  if (htmlFailures.length > 0) {
    for (const failure of htmlFailures) {
      console.error(`${failure.kind} ${failure.where}: ${failure.error}`);
    }
    throw new Error(`${htmlFailures.length} built script(s) failed to parse`);
  }
  console.log("built HTML scripts parse");

  const port = Number(process.env.HYDRATION_PORT ?? 3499);
  const base = `http://127.0.0.1:${port}`;
  const server = spawn("npx", ["next", "start", "--port", String(port)], {
    stdio: "inherit",
    env: process.env,
  });
  const stop = () => {
    if (!server.killed) server.kill("SIGTERM");
  };
  process.on("exit", stop);

  try {
    await waitForServer(`${base}/`);
    const browser = await puppeteer.launch({
      executablePath: chromePath(),
      headless: true,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const problems: string[] = [];
    try {
      for (const pagePath of PAGES) {
        for (const viewport of VIEWPORTS) {
          const page = await browser.newPage();
          await page.setViewport(viewport);
          const errors: string[] = [];
          page.on("pageerror", (error) => errors.push(error.message));
          page.on("console", (message) => {
            if (message.type() === "error") errors.push(message.text());
          });
          await page.goto(`${base}${pagePath}`, { waitUntil: "networkidle0", timeout: 60_000 });
          const hydrated = await page.evaluate(() => {
            const next = (window as unknown as { next?: { version?: string } }).next;
            return typeof next !== "undefined" && typeof next.version === "string";
          });
          await page.close();
          const label = `${pagePath} ${viewport.name}`;
          if (!hydrated) problems.push(`${label}: window.next.version missing`);
          for (const error of errors) problems.push(`${label}: ${error}`);
          if (hydrated && errors.length === 0) console.log("hydrated", label);
        }
      }
    } finally {
      await browser.close();
    }
    if (problems.length > 0) {
      for (const problem of problems) console.error(problem);
      throw new Error(`${problems.length} hydration failure(s)`);
    }
  } finally {
    stop();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
