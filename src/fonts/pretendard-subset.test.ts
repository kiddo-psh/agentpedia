import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import meta from "./pretendard-subset-meta.json";

const root = path.join(process.cwd(), "src");

describe("pretendard content-scanned subset", () => {
  it("keeps critical first-paint face well under the old ~384 KB dynamic pack", () => {
    expect(meta.critical.bytes).toBeLessThan(200_000);
    expect(meta.totalBytes).toBeLessThan(300_000);
    expect(meta.critical.hangul).toBeGreaterThan(100);
  });

  it("ships both woff2 files and generated CSS wired for unicode-range", () => {
    const css = fs.readFileSync(path.join(root, "app/pretendard-subset.css"), "utf8");
    expect(css).toContain("pretendard-critical.woff2");
    expect(css).toContain("pretendard-content.woff2");
    expect(css).toContain("unicode-range:");
    expect(css).toContain('font-family: "Pretendard Variable"');

    for (const file of [meta.critical.file, meta.content.file]) {
      const abs = path.join(process.cwd(), file);
      expect(fs.existsSync(abs), abs).toBe(true);
      expect(fs.statSync(abs).size).toBeGreaterThan(1_000);
    }
  });

  it("covers the Lauren Tan article title in the critical face unicode-range", () => {
    const css = fs.readFileSync(path.join(root, "app/pretendard-subset.css"), "utf8");
    const criticalBlock = css.split("@font-face")[1] ?? "";
    const rangeMatch = criticalBlock.match(/unicode-range:\s*([^;]+);/);
    expect(rangeMatch).toBeTruthy();
    const ranges = parseUnicodeRanges(rangeMatch![1]!);
    const title = "Lauren Tan이 말한 에이전트 슬롭 방지와 검증의 순서";
    for (const ch of title) {
      const code = ch.codePointAt(0)!;
      if (code < 0x20) continue;
      expect(inRanges(code, ranges), `U+${code.toString(16)} (${ch})`).toBe(true);
    }
  });
});

type Range = { lo: number; hi: number };

function parseUnicodeRanges(spec: string): Range[] {
  return spec.split(",").map((part) => {
    const cleaned = part.trim().replace(/^U\+/i, "");
    if (cleaned.includes("-")) {
      const [a, b] = cleaned.split("-");
      return { lo: parseInt(a!, 16), hi: parseInt(b!, 16) };
    }
    const n = parseInt(cleaned, 16);
    return { lo: n, hi: n };
  });
}

function inRanges(code: number, ranges: Range[]) {
  return ranges.some((r) => code >= r.lo && code <= r.hi);
}
