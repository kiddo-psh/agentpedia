import { strToU8, zipSync } from "fflate";
import { REQUIRED_KIT_FILE, type Article, type KitFile } from "./schema";

/** prompt.md first (it is the entry point), then the rest alphabetically. */
export function orderedKit(kit: KitFile[]): KitFile[] {
  return [...kit].sort((a, b) =>
    a.path === REQUIRED_KIT_FILE ? -1 : b.path === REQUIRED_KIT_FILE ? 1 : a.path.localeCompare(b.path),
  );
}

export function kitReadme(article: Article, articleUrl: string): string {
  return [
    `# ${article.title} — 적용 키트`,
    "",
    `원문 요약: ${articleUrl}`,
    "",
    "## 사용법",
    "",
    `에이전트(Claude Code, Cursor 등)에게 \`${REQUIRED_KIT_FILE}\`를 읽고 그대로 진행하라고 요청하세요.`,
    "작업이 끝나면 `checklist.md`로 결과를 점검하세요.",
    "",
    "## 핵심 아이디어",
    "",
    ...article.keyIdeas.map((idea) => `- ${idea}`),
    "",
    "## 출처",
    "",
    ...article.sources.map((s) => `- [${s.title}](${s.url}) — ${s.author}`),
    "",
  ].join("\n");
}

/** Zip laid out as `<slug>-kit/README.md` plus every kit file. */
export function buildKitArchive(article: Article, articleUrl: string): Uint8Array {
  const root = `${article.slug}-kit`;
  const files: Record<string, Uint8Array> = {
    [`${root}/README.md`]: strToU8(kitReadme(article, articleUrl)),
  };
  for (const f of article.kit) files[`${root}/${f.path}`] = strToU8(f.content);
  return zipSync(files);
}
