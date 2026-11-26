import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cmapCodepoints, codepointsIn, contentCodepoints, inRanges, parseFontFaces } from "./fontCoverage";

const root = process.cwd();
const cssPaths = [
  path.join(root, "public/fonts/pretendard-shell.css"),
  path.join(root, "public/fonts/pretendard-rest.css"),
];

describe("served Pretendard faces", () => {
  it("cover every non-ascii glyph used in content and UI", async () => {
    const css = cssPaths.map((file) => fs.readFileSync(file, "utf8")).join("\n");
    const faces = parseFontFaces(css);
    expect(faces.length).toBeGreaterThanOrEqual(4);
    const loaded = [];
    for (const face of faces) {
      const file = face.url.startsWith("/fonts/")
        ? path.join(root, "public", face.url.slice(1))
        : path.join(root, face.url);
      const cmap = await cmapCodepoints(fs.readFileSync(file));
      loaded.push({ ...face, cmap });
    }

    const source = await cmapCodepoints(
      fs.readFileSync(path.join(root, "node_modules/pretendard/dist/public/variable/PretendardVariable.ttf")),
    );
    const missing: string[] = [];
    for (const [code, file] of contentCodepoints()) {
      const first = loaded.find((item) => inRanges(code, item.ranges));
      if (!source.has(code)) {
        if (first) {
          missing.push(
            `U+${code.toString(16)} ${String.fromCodePoint(code)} is outside Pretendard but ${first.url} claims it (${file})`,
          );
        }
        continue;
      }
      if (!first || !first.cmap.has(code)) {
        missing.push(`U+${code.toString(16)} ${String.fromCodePoint(code)} (${file})`);
      }
    }
    expect(missing, missing.slice(0, 12).join("\n")).toEqual([]);
  });

  it("covers survey, community, and component copy in the shell or ui face", async () => {
    const css = cssPaths.map((file) => fs.readFileSync(file, "utf8")).join("\n");
    const faces = parseFontFaces(css).filter(
      (face) => face.url.includes("pretendard-shell.woff2") || face.url.includes("pretendard-ui.woff2"),
    );
    const loaded = [];
    for (const face of faces) {
      const cmap = await cmapCodepoints(fs.readFileSync(path.join(root, "public", face.url.slice(1))));
      loaded.push({ ...face, cmap });
    }
    const source = await cmapCodepoints(
      fs.readFileSync(path.join(root, "node_modules/pretendard/dist/public/variable/PretendardVariable.ttf")),
    );
    const samples = ["src/survey", "src/components", "src/app/community", "src/components/survey"];
    const missing: string[] = [];
    for (const sample of samples) {
      for (const [code, file] of codepointsIn(sample)) {
        if (!source.has(code)) continue;
        const face = loaded.find((item) => inRanges(code, item.ranges) && item.cmap.has(code));
        if (!face) missing.push(`U+${code.toString(16)} ${String.fromCodePoint(code)} (${file})`);
      }
    }
    expect(missing, missing.slice(0, 12).join("\n")).toEqual([]);
  });

  it("keeps every Hangul syllable in the fallback file, and serves it when no earlier face does", async () => {
    const css = cssPaths.map((file) => fs.readFileSync(file, "utf8")).join("\n");
    const faces = parseFontFaces(css);
    const fallback = faces.find((face) => face.url.includes("pretendard-fallback.woff2"));
    expect(fallback).toBeTruthy();
    const earlier = faces.filter((face) => face !== fallback);
    const cmap = await cmapCodepoints(
      fs.readFileSync(path.join(root, "public/fonts/pretendard-fallback.woff2")),
    );
    const holes: string[] = [];
    for (let code = 0xac00; code <= 0xd7a3; code++) {
      const coveredEarlier = earlier.some((face) => inRanges(code, face.ranges));
      if (!cmap.has(code) || (!coveredEarlier && !inRanges(code, fallback!.ranges))) {
        holes.push(`U+${code.toString(16)}`);
      }
      if (holes.length > 8) break;
    }
    expect(holes, holes.join(" ")).toEqual([]);
  });
});
