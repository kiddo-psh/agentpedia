import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import { visit } from "unist-util-visit";
import type { Root } from "mdast";
import { ContentError } from "./loader";
import { AgentFacts, type Agent, type AgentFacts as AgentFactsType, type AgentForm } from "./schema";

export const FORM_LABEL: Record<AgentForm, string> = {
  cli: "CLI",
  ide: "IDE",
  extension: "확장",
  cloud: "클라우드",
};

/** Build warns, and does not fail, when a sourced fact is older than this. */
export const STALE_AFTER_DAYS = 90;

const DAY_MS = 86_400_000;

export type AgentParseResult = { ok: true; agent: Agent } | { ok: false; issues: string[] };

function utcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Whole UTC days from `asOf` to `now`. Positive when `asOf` is in the past. */
export function ageDays(asOf: Date, now: Date): number {
  return Math.floor((utcDay(now) - utcDay(asOf)) / DAY_MS);
}

type Dated = { asOf: Date };

/** Labels for sourced fields the weekly job or an editor may leave empty. */
const DATED_FIELDS = [
  ["latestVersion", "latestVersion"],
  ["pricingSummary", "pricingSummary"],
  ["npmWeeklyDownloads", "npmWeeklyDownloads"],
  ["githubStars", "githubStars"],
  ["surveyUsage", "surveyUsage"],
] as const;

/** Facts whose asOf is more than 90 days behind `now`. The build prints these; it still succeeds. */
export function staleFactIssues(facts: AgentFactsType, now: Date): string[] {
  const issues: string[] = [];
  const check = (label: string, dated: Dated | undefined) => {
    if (!dated) return;
    const age = ageDays(dated.asOf, now);
    if (age > STALE_AFTER_DAYS) {
      issues.push(`${label}: asOf is ${age} days old (over ${STALE_AFTER_DAYS})`);
    }
  };
  for (const [key, label] of DATED_FIELDS) check(label, facts[key]);
  facts.benchmarks.forEach((row, i) => check(`benchmarks[${i}]`, row));
  return issues;
}

export function staleAgentWarnings(agents: readonly Agent[], now: Date): string[] {
  return agents.flatMap((agent) => staleFactIssues(agent, now).map((issue) => `${agent.slug}: ${issue}`));
}

function bodyIssues(body: string): string[] {
  const issues: string[] = [];
  let tree: Root;
  try {
    tree = unified().use(remarkParse).use(remarkMdx).parse(body);
  } catch (e) {
    return [`index.mdx: ${(e as Error).message}`];
  }
  visit(tree, (node) => {
    if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
      const line = node.position?.start.line ?? "?";
      issues.push(`line ${line}: agent prose is markdown only (<${node.name ?? ""}> is not allowed)`);
    }
    if (node.type === "heading" && node.depth === 1) {
      const line = node.position?.start.line ?? "?";
      issues.push(`line ${line}: the page title is the agent name; body headings start at "##"`);
    }
  });
  return issues;
}

/** Pure: facts.yaml text plus index.mdx. Collects every problem. */
export function parseAgentDir(dirName: string, factsRaw: string, body: string): AgentParseResult {
  const issues: string[] = [];
  let data: unknown;
  try {
    data = parseYaml(factsRaw);
  } catch (e) {
    return { ok: false, issues: [`facts.yaml: ${(e as Error).message}`] };
  }

  const facts = AgentFacts.safeParse(data);
  if (!facts.success) {
    for (const issue of facts.error.issues) {
      issues.push(`facts.${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    return { ok: false, issues };
  }
  if (facts.data.slug !== dirName) {
    issues.push(`facts.slug "${facts.data.slug}" must equal directory name "${dirName}"`);
  }
  if (!body.trim()) issues.push("index.mdx is empty");
  issues.push(...bodyIssues(body));
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, agent: { ...facts.data, bodyMarkdown: body.trim() } };
}

function agentsDir(): string {
  return path.join(process.cwd(), "content", "agents");
}

/** Reads and validates every agent. Throws ContentError listing all problems. */
export function loadAllAgents(): Agent[] {
  const dir = agentsDir();
  if (!fs.existsSync(dir)) return [];
  const agents: Agent[] = [];
  const problems: { dir: string; issues: string[] }[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const factsPath = path.join(process.cwd(), "content", "agents", entry.name, "facts.yaml");
    const indexPath = path.join(process.cwd(), "content", "agents", entry.name, "index.mdx");
    const issues: string[] = [];
    if (!fs.existsSync(factsPath)) issues.push("facts.yaml is missing");
    if (!fs.existsSync(indexPath)) issues.push("index.mdx is missing");
    if (issues.length > 0) {
      problems.push({ dir: entry.name, issues });
      continue;
    }
    const result = parseAgentDir(
      entry.name,
      fs.readFileSync(factsPath, "utf8"),
      fs.readFileSync(indexPath, "utf8"),
    );
    if (result.ok) agents.push(result.agent);
    else problems.push({ dir: entry.name, issues: result.issues });
  }

  if (problems.length > 0) throw new ContentError(problems);
  return agents.sort((a, b) => a.name.localeCompare(b.name));
}

let cache: Agent[] | undefined;
function all(): Agent[] {
  if (process.env.NODE_ENV !== "production") return loadAllAgents();
  return (cache ??= loadAllAgents());
}

export function listAgents(): Agent[] {
  return all();
}

export function getAgent(slug: string): Agent | null {
  return all().find((agent) => agent.slug === slug) ?? null;
}
