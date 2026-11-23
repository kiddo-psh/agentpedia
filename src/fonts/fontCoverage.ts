import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const { convert } = createRequire(path.join(process.cwd(), "package.json"))("fontverter") as {
  convert: (buf: Buffer, toFormat: string) => Promise<Buffer>;
};

export type FontFace = {
  url: string;
  ranges: Array<{ lo: number; hi: number }>;
};

const TEXT_EXT = /\.(mdx|md|tsx|ts|css|yaml|yml)$/;

/** Codepoints a system emoji font is allowed to draw. */
export function isSystemEmoji(code: number): boolean {
  return (
    (code >= 0x1f000 && code <= 0x1faff) ||
    (code >= 0x2600 && code <= 0x27bf) ||
    code === 0xfe0f ||
    code === 0x200d
  );
}

export function parseUnicodeRanges(spec: string): Array<{ lo: number; hi: number }> {
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

export function parseFontFaces(css: string): FontFace[] {
  const faces: FontFace[] = [];
  for (const block of css.split("@font-face").slice(1)) {
    const url = block.match(/url\("([^"]+)"\)/)?.[1];
    const range = block.match(/unicode-range:\s*([^;]+);/)?.[1];
    if (!url || !range) continue;
    faces.push({ url, ranges: parseUnicodeRanges(range) });
  }
  return faces;
}

export async function cmapCodepoints(woff2: Buffer): Promise<Set<number>> {
  const converted = await convert(woff2, "sfnt");
  const sfnt = Buffer.isBuffer(converted) ? converted : Buffer.from(converted);
  if (sfnt.length < 12) {
    throw new Error(`sfnt too small (${sfnt.length}) from woff2 ${woff2.length}`);
  }
  const points = new Set<number>();
  const numTables = sfnt.readUInt16BE(4);
  let cmapOffset = -1;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    if (sfnt.toString("ascii", rec, rec + 4) === "cmap") {
      cmapOffset = sfnt.readUInt32BE(rec + 8);
      break;
    }
  }
  if (cmapOffset < 0) return points;
  const numSub = sfnt.readUInt16BE(cmapOffset + 2);
  for (let i = 0; i < numSub; i++) {
    const off = sfnt.readUInt32BE(cmapOffset + 8 + i * 8);
    readCmapSubtable(sfnt, cmapOffset + off, points);
  }
  return points;
}

function readCmapSubtable(sfnt: Buffer, sub: number, points: Set<number>) {
  const format = sfnt.readUInt16BE(sub);
  if (format === 4) {
    const segCount = sfnt.readUInt16BE(sub + 6) / 2;
    const endCount = sub + 14;
    const startCount = endCount + segCount * 2 + 2;
    const idDelta = startCount + segCount * 2;
    const idRangeOffset = idDelta + segCount * 2;
    for (let s = 0; s < segCount; s++) {
      const end = sfnt.readUInt16BE(endCount + s * 2);
      const start = sfnt.readUInt16BE(startCount + s * 2);
      const delta = sfnt.readInt16BE(idDelta + s * 2);
      const rangeOff = sfnt.readUInt16BE(idRangeOffset + s * 2);
      if (start === 0xffff) continue;
      for (let code = start; code <= end; code++) {
        let glyph = 0;
        if (rangeOff === 0) {
          glyph = (code + delta) & 0xffff;
        } else {
          const glyphIndexOffset = idRangeOffset + s * 2 + rangeOff + (code - start) * 2;
          glyph = sfnt.readUInt16BE(glyphIndexOffset);
          if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
        }
        if (glyph !== 0) points.add(code);
      }
    }
    return;
  }
  if (format === 12) {
    const nGroups = sfnt.readUInt32BE(sub + 12);
    for (let g = 0; g < nGroups; g++) {
      const base = sub + 16 + g * 12;
      const start = sfnt.readUInt32BE(base);
      const end = sfnt.readUInt32BE(base + 4);
      const glyphStart = sfnt.readUInt32BE(base + 8);
      for (let code = start; code <= end; code++) {
        if (glyphStart + (code - start) !== 0) points.add(code);
      }
    }
  }
}

export function inRanges(code: number, ranges: Array<{ lo: number; hi: number }>) {
  return ranges.some((range) => code >= range.lo && code <= range.hi);
}

function walkTextFiles(dir: string, out: string[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTextFiles(abs, out);
    else if (TEXT_EXT.test(entry.name)) out.push(abs);
  }
}

/** Non-ascii characters in articles, chrome, and UI source. */
export function contentCodepoints(root = process.cwd()): Map<number, string> {
  const files: string[] = [];
  walkTextFiles(path.join(root, "content"), files);
  walkTextFiles(path.join(root, "src"), files);
  const found = new Map<number, string>();
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const ch of text) {
      const code = ch.codePointAt(0)!;
      if (code < 0x80 || isSystemEmoji(code) || found.has(code)) continue;
      found.set(code, path.relative(root, file));
    }
  }
  return found;
}
