// Usage: tsx scripts/bench-server-cpu.mts <route> <requests> [out.cpuprofile]
// Run after `next build`. Wall time on Windows is quantized to its 15.6 ms timer tick, so compare
// server CPU per request instead.
// Serves the built app in-process and drives load from a child process, so the profile holds
// only server work. In Git Bash, set MSYS_NO_PATHCONV=1 or the route gets rewritten to a path.
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { Session } from "node:inspector/promises";
import fs from "node:fs";

const [route = "/", nStr = "200", out] = process.argv.slice(2);
const n = Number(nStr);
const dir = process.cwd();
(process.env as Record<string, string>).NODE_ENV = "production";
const require = createRequire(dir + "/package.json");
const app = require("next")({ dev: false, dir });
await app.prepare();
const handle = app.getRequestHandler();
const server = createServer((req, res) => handle(req, res));
await new Promise<void>((r) => server.listen(3218, () => r()));

const url = "http://localhost:3218" + route;
const load = (count: number) =>
  new Promise<number>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "-e",
        `(async()=>{const t=performance.now();for(let i=0;i<${count};i++){const r=await fetch(${JSON.stringify(url)});await r.arrayBuffer();if(r.status!==200)throw new Error("status "+r.status)}console.log(((performance.now()-t)/${count}).toFixed(1))})()`,
      ],
      { stdio: ["ignore", "pipe", "inherit"] },
    );
    let s = "";
    child.stdout.on("data", (d) => (s += d));
    child.on("exit", (code) => (code === 0 ? resolve(Number(s)) : reject(new Error("load failed " + code))));
  });

await load(20);
const profiling = !!out;
const session = new Session();
if (profiling) {
  session.connect();
  await session.post("Profiler.enable");
  await session.post("Profiler.setSamplingInterval", { interval: 200 });
  await session.post("Profiler.start");
}
const cpu0 = process.cpuUsage();
const msPerRequest = await load(n);
const cpu = process.cpuUsage(cpu0);
if (profiling) {
  const { profile } = await session.post("Profiler.stop");
  fs.writeFileSync(out!, JSON.stringify(profile));
}
const cpuMsPerRequest = +((cpu.user + cpu.system) / 1000 / n).toFixed(2);
console.log(JSON.stringify({ route, n, msPerRequest, cpuMsPerRequest }));
server.close();
process.exit(0);
