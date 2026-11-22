import fs from "node:fs";
import path from "node:path";
import { patchNextServerBundle } from "../src/perf/delayFrameworkScripts";

const BUNDLES = [
  "node_modules/next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",
  "node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js",
];

const root = process.cwd();
for (const rel of BUNDLES) {
  const file = path.join(root, rel);
  const source = fs.readFileSync(file, "utf8");
  const patched = patchNextServerBundle(source);
  if (patched !== source) {
    fs.writeFileSync(file, patched);
    console.log(`delay framework scripts: patched ${rel}`);
  } else {
    console.log(`delay framework scripts: already patched ${rel}`);
  }
}
