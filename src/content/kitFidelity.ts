import { REQUIRED_KIT_FILE, type Article } from "./schema";

/** Significant tokens from a claim string (Korean syllables / Latin words, length ≥ 2). */
export function claimTokens(text: string): string[] {
  const parts = text.match(/[A-Za-z][A-Za-z0-9+./_-]{1,}|[가-힣]{2,}/g) ?? [];
  return [...new Set(parts.map((p) => p.toLowerCase()))];
}

function promptFile(article: Article): string | undefined {
  return article.kit.find((f) => f.path === REQUIRED_KIT_FILE)?.content;
}

/** Text before the first ## heading — the claim intro writing-guide §8 requires. */
export function promptIntro(prompt: string): string {
  const cut = prompt.search(/\n##\s/);
  return (cut === -1 ? prompt : prompt.slice(0, cut)).trim();
}

function hasStopGate(prompt: string): boolean {
  // 멈추다 conjugates across syllable finals: 멈추고 / 멈춘 / 멈춥니다 / 멈출 …
  return /멈추|멈춘|멈춥|멈출/.test(prompt) && /(맞지 않|해당하지 않|없으면|이유를 설명한 뒤 멈|여기서 멈추)/.test(prompt);
}

function hasApproveGate(prompt: string): boolean {
  return /승인/.test(prompt);
}

function hasVerifyByRunning(prompt: string): boolean {
  return /실행해|실행해서|실제로 실행/.test(prompt);
}

/** Primary output paths in apply.changes (skips date-suffix placeholders like …-YYYY-MM-DD.md). */
export function pathsInChanges(changes: string[]): string[] {
  const found = new Set<string>();
  for (const c of changes) {
    for (const m of c.matchAll(/`((?:[\w.-]+\/)+[\w.-]+\.(?:md|json|toml|ya?ml|ts|js|mjs|cjs))`/gi)) {
      const p = m[1];
      if (/YYYY|MM-DD|\$\{/.test(p)) continue;
      found.add(p);
    }
  }
  return [...found];
}

/**
 * Boris alone owns "append verify commands into CLAUDE.md / instruction files".
 * Other kits may mention the pattern only to refuse it or point at Boris.
 */
const BORIS_SLUG = "boris-cherny-claude-code-workflow";
const BORIS_OWNED =
  /검증\s*명령(?:을|을?\s*)?(?:지시\s*파일|CLAUDE\.md)에\s*(?:덧붙|추가|쌓)/;

function refusesBorisOwned(text: string): boolean {
  return /하지\s*않는다|하지\s*않습니다|범위다|Boris|보리스/.test(text);
}

/** Long Claude Code / AGENTS load encyclopedias that are not the article claim. */
function hasAgentsLoadEncyclopedia(prompt: string): boolean {
  // Kits may refuse encyclopedias in one line; flag only positive long matrices.
  if (/버전·플러그인\s*키\s*장문을?\s*쓰지\s*않는다|설정\s*레퍼런스\s*장문을?\s*.*베끼지\s*않습니다|버전·플러그인\s*설정\s*판정\s*장문을?\s*보고서에\s*넣지\s*않습니다/.test(prompt)) {
    return false;
  }
  const loadTalk = (prompt.match(/AGENTS\.md[\s\S]{0,80}로드|로드[\s\S]{0,80}AGENTS\.md/gi) ?? []).length;
  const versionTalk = (prompt.match(/Claude Code 버전|instructionFiles|Project instructions/gi) ?? []).length;
  return loadTalk >= 3 && versionTalk >= 2;
}

/**
 * Static fidelity checks for kit/prompt.md against article claims and writing-guide §8.
 * Returns human-readable issue strings (empty = ok).
 */
export function checkKitFidelity(article: Article): string[] {
  const issues: string[] = [];
  const prompt = promptFile(article);
  if (!prompt) {
    issues.push(`kit/${REQUIRED_KIT_FILE} is missing`);
    return issues;
  }

  const intro = promptIntro(prompt);
  const cues = [
    ...article.persons.flatMap((p) => claimTokens(`${p.name} ${p.nameKo}`)),
    ...article.keyIdeas.flatMap(claimTokens),
  ];
  const introLower = intro.toLowerCase();
  const hit = cues.some((t) => introLower.includes(t));
  if (cues.length > 0 && !hit) {
    issues.push(
      `kit/${REQUIRED_KIT_FILE} intro must mention a person from the article or a keyword from keyIdeas (writing-guide §8 claim)`,
    );
  }

  if (!hasStopGate(prompt)) {
    issues.push(`kit/${REQUIRED_KIT_FILE} must tell the agent to stop when the repo is a poor fit`);
  }
  if (!hasApproveGate(prompt)) {
    issues.push(`kit/${REQUIRED_KIT_FILE} must require a plan and user approval before changes`);
  }
  if (!hasVerifyByRunning(prompt)) {
    issues.push(`kit/${REQUIRED_KIT_FILE} must verify by running commands (not guessing)`);
  }

  const h1 = prompt.match(/^#\s+(.+)$/m)?.[1] ?? "";
  const goalTokens = claimTokens(article.apply.goal).filter((t) => t.length >= 3);
  const h1Lower = h1.toLowerCase();
  const goalOverlap = goalTokens.filter((t) => h1Lower.includes(t) || introLower.includes(t));
  if (goalTokens.length > 0 && goalOverlap.length === 0) {
    issues.push(`kit/${REQUIRED_KIT_FILE} H1/intro should reflect apply.goal`);
  }

  for (const p of pathsInChanges(article.apply.changes)) {
    if (!prompt.includes(p)) {
      issues.push(`kit/${REQUIRED_KIT_FILE} should mention apply.changes path "${p}"`);
    }
  }

  if (article.slug !== BORIS_SLUG) {
    for (const m of prompt.matchAll(new RegExp(BORIS_OWNED.source, "gi"))) {
      const start = Math.max(0, (m.index ?? 0) - 80);
      const window = prompt.slice(start, (m.index ?? 0) + m[0].length + 80);
      if (!refusesBorisOwned(window)) {
        issues.push(
          `kit/${REQUIRED_KIT_FILE} must not take Boris's job (append verify commands to CLAUDE.md); refuse or leave it to that kit`,
        );
        break;
      }
    }
  }

  if (hasAgentsLoadEncyclopedia(prompt)) {
    issues.push(
      `kit/${REQUIRED_KIT_FILE} looks like an AGENTS.md / Claude Code settings encyclopedia; keep product-load rules to a short confirm-against-docs line`,
    );
  }

  return issues;
}
