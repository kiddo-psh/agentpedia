import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import { visit } from "unist-util-visit";
import type { Root } from "mdast";
import { z } from "zod";
import { ContentError } from "./loader";
import { ModelFacts, type Model, type ModelFacts as ModelFactsType } from "./schema";
import { ageDays, STALE_AFTER_DAYS } from "./agents";

export type ModelParseResult = { ok: true; model: Model } | { ok: false; issues: string[] };

type Dated = { asOf: Date };

const DATED_FIELDS = [
  ["inputUsdPerMTok", "inputUsdPerMTok"],
  ["outputUsdPerMTok", "outputUsdPerMTok"],
] as const;

export function staleModelFactIssues(facts: ModelFactsType, now: Date): string[] {
  const issues: string[] = [];
  const check = (label: string, dated: Dated | undefined) => {
    if (!dated) return;
    const age = ageDays(dated.asOf, now);
    if (age > STALE_AFTER_DAYS) issues.push(`${label}: asOf is ${age} days old (>${STALE_AFTER_DAYS})`);
  };
  for (const [key, label] of DATED_FIELDS) check(label, facts[key]);
  for (const [i, row] of facts.benchmarks.entries()) check(`benchmarks[${i}]`, row);
  return issues;
}

function rejectJsx(tree: Root, issues: string[]) {
  visit(tree, (node) => {
    if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
      issues.push("model prose must be markdown, not JSX");
    }
  });
}

export function parseModelDir(dir: string, slug: string): ModelParseResult {
  const factsPath = path.join(dir, "facts.yaml");
  const bodyPath = path.join(dir, "index.mdx");
  const issues: string[] = [];
  if (!fs.existsSync(factsPath)) issues.push("missing facts.yaml");
  if (!fs.existsSync(bodyPath)) issues.push("missing index.mdx");
  if (issues.length > 0) return { ok: false, issues };

  const raw = parseYaml(fs.readFileSync(factsPath, "utf8"));
  const facts = ModelFacts.safeParse(raw);
  if (!facts.success) {
    return { ok: false, issues: facts.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) };
  }
  if (facts.data.slug !== slug) issues.push(`facts slug "${facts.data.slug}" must match folder "${slug}"`);

  const body = fs.readFileSync(bodyPath, "utf8");
  const tree = unified().use(remarkParse).use(remarkMdx).parse(body) as Root;
  rejectJsx(tree, issues);
  if (issues.length > 0) return { ok: false, issues };

  return { ok: true, model: { ...facts.data, bodyMarkdown: body.trim() } };
}

export function loadAllModels(): Model[] {
  const root = path.join(process.cwd(), "content", "models");
  if (!fs.existsSync(root)) return [];
  const models: Model[] = [];
  const problems: { dir: string; issues: string[] }[] = [];

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    const result = parseModelDir(path.join(root, entry.name), entry.name);
    if (result.ok) models.push(result.model);
    else problems.push({ dir: entry.name, issues: result.issues });
  }

  if (problems.length > 0) throw new ContentError(problems);
  return models.sort((a, b) => a.name.localeCompare(b.name));
}

let cache: Model[] | undefined;
function all(): Model[] {
  if (process.env.NODE_ENV !== "production") return loadAllModels();
  return (cache ??= loadAllModels());
}

export function listModels(): Model[] {
  return all();
}

export function getModel(slug: string): Model | null {
  return all().find((model) => model.slug === slug) ?? null;
}

/** Prefer Terminal-Bench 4.1 when present; otherwise the first benchmark. */
export function primaryBenchmark(model: Model) {
  return (
    model.benchmarks.find((row) => row.bench === "Terminal-Bench" && row.version === "4.1") ??
    model.benchmarks[0]
  );
}

/** Models ranked by Terminal-Bench 4.1 score, highest first. Missing scores sink to the bottom. */
export function rankModelsByTerminalBench(models: Model[] = listModels()) {
  return [...models].sort((a, b) => {
    const sa = primaryBenchmark(a)?.score;
    const sb = primaryBenchmark(b)?.score;
    if (sa === undefined && sb === undefined) return a.name.localeCompare(b.name, "ko");
    if (sa === undefined) return 1;
    if (sb === undefined) return -1;
    return sb - sa || a.name.localeCompare(b.name, "ko");
  });
}

export function staleModelWarnings(models: Model[], now: Date): string[] {
  return models.flatMap((model) =>
    staleModelFactIssues(model, now).map((issue) => `${model.slug}: ${issue}`),
  );
}

/** Sourced Vals SWE-bench Verified rows for the duration / cost-per-task chart. */
export const TaskTimingRow = z.object({
  model: z.string().min(1),
  vendor: z.string().min(1),
  score: z.number(),
  costUsd: z.number().nonnegative(),
  durationSec: z.number().nonnegative(),
  tokensPerTest: z.string().min(1),
  url: z.url(),
  asOf: z.coerce.date(),
  note: z.string().min(1).optional(),
});
export type TaskTimingRow = z.infer<typeof TaskTimingRow>;

const TaskTimingFile = z.object({ rows: z.array(TaskTimingRow) });

export function loadTaskTiming(): TaskTimingRow[] {
  const file = path.join(process.cwd(), "content", "models", "_task-timing.yaml");
  if (!fs.existsSync(file)) return [];
  const parsed = TaskTimingFile.safeParse(parseYaml(fs.readFileSync(file, "utf8")));
  if (!parsed.success) {
    throw new ContentError([
      {
        dir: "models/_task-timing.yaml",
        issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
      },
    ]);
  }
  return parsed.data.rows;
}
