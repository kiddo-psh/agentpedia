/**
 * Grep-able Korean style warnings. They never fail validation.
 * Sentence limit is 60 characters, counting every character including spaces.
 */

const SPEECH = /라고\s*(?:말|썼|적|봅)니다|라고\s*합니다|다고\s*합니다/;
const PRONOUN = /(^|[^가-힣])(그는|그가|그의|그를|그녀|그들|그것)/;
const MEMO = /확인했습니다|읽은 문서에 따르면|공식 문서 기준/;

export function koreanStyleWarnings(markdown: string): string[] {
  const prose = stripNonProse(markdown);
  const warnings: string[] = [];
  for (const sentence of sentences(prose)) {
    if (hangulRatio(sentence) < 0.3) continue;
    const length = [...sentence].length;
    if (length > 60) warnings.push(`문장 60자 초과 (${length}자): ${clip(sentence)}`);
  }
  if (SPEECH.test(prose)) warnings.push("간접화법 꼬리(라고 말합니다/썼습니다/적습니다/봅니다, 다고 합니다)");
  if (PRONOUN.test(prose)) warnings.push("3인칭 대명사(그는/그녀/그들/그것)");
  if (MEMO.test(prose)) warnings.push("본문 검증 메모(확인했습니다, ○일 기준)");
  for (const paragraph of prose.split(/\n\s*\n/)) {
    const withoutTables = paragraph
      .split("\n")
      .filter((line) => !/^\s*\|/.test(line))
      .join("\n");
    const opens = withoutTables.match(/\(|（/g);
    if (opens && opens.length > 1) warnings.push(`괄호가 문단당 1개를 넘음: ${clip(withoutTables)}`);
  }
  return warnings;
}

function stripNonProse(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<Quote[\s\S]*?<\/Quote>/g, " ")
    .replace(/`[^`\n]*`/g, " ");
}

function sentences(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.replace(/^#{1,6}\s*/, "").trim();
    if (!trimmed) continue;
    if (!/[.?!]/.test(trimmed)) {
      out.push(trimmed);
      continue;
    }
    for (const part of trimmed.split(/(?<=[.?!])\s+/)) {
      const sentence = part.trim();
      if (sentence) out.push(sentence);
    }
  }
  return out;
}

function hangulRatio(text: string): number {
  const chars = [...text];
  if (chars.length === 0) return 0;
  const hangul = chars.filter((char) => /[가-힣]/.test(char)).length;
  return hangul / chars.length;
}

function clip(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 42 ? `${flat.slice(0, 42)}…` : flat;
}
