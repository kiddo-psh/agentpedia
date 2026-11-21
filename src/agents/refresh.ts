import fs from "node:fs";
import path from "node:path";
import { parseDocument, type Document } from "yaml";
import { AgentFacts } from "../content/schema";
import type { FetchFn } from "./collectors/fetch";
import { fetchGithubStars, fetchLatestRelease, githubRepo } from "./collectors/github";
import { fetchNpmWeekly } from "./collectors/npm";

export type { FetchFn };

export type RefreshOptions = {
  cwd?: string;
  fetchFn?: FetchFn;
  now?: Date;
  token?: string;
};

export type RefreshResult = {
  updated: string[];
  unchanged: string[];
  errors: string[];
};

type Fact = { value: number | string; sourceUrl: string; asOf: string };

function asOfString(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.slice(0, 10);
  return undefined;
}

function readFact(doc: Document, key: string): Fact | undefined {
  const value = doc.getIn([key, "value"]);
  const sourceUrl = doc.getIn([key, "sourceUrl"]);
  const asOf = asOfString(doc.getIn([key, "asOf"]));
  if ((typeof value !== "number" && typeof value !== "string") || typeof sourceUrl !== "string" || !asOf) {
    return undefined;
  }
  return { value, sourceUrl, asOf };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sameFact(current: Fact | undefined, next: Fact): boolean {
  return current?.value === next.value && current.sourceUrl === next.sourceUrl && current.asOf === next.asOf;
}

function assignFact(doc: Document, key: string, next: Fact): boolean {
  if (sameFact(readFact(doc, key), next)) return false;
  doc.set(key, { value: next.value, sourceUrl: next.sourceUrl, asOf: next.asOf });
  return true;
}

async function refreshFile(
  file: string,
  slug: string,
  opts: { fetchFn: FetchFn; now: Date; token?: string },
  errors: string[],
): Promise<"updated" | "unchanged"> {
  const doc = parseDocument(fs.readFileSync(file, "utf8"));
  const parsed = AgentFacts.safeParse(doc.toJS());
  if (!parsed.success) {
    errors.push(`${slug}: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
    return "unchanged";
  }
  const facts = parsed.data;
  let dirty = false;

  if (facts.npmPackage) {
    try {
      const weekly = await fetchNpmWeekly(facts.npmPackage, opts.fetchFn);
      dirty = assignFact(doc, "npmWeeklyDownloads", weekly) || dirty;
    } catch (e) {
      errors.push(`${slug} npm: ${errorMessage(e)}`);
    }
  }

  const repo = facts.repoUrl ? githubRepo(facts.repoUrl) : null;
  if (facts.repoUrl && !repo) errors.push(`${slug} github: repoUrl is not a github.com repository`);
  if (repo) {
    try {
      const stars = await fetchGithubStars(repo, opts.fetchFn, opts.token);
      dirty = assignFact(doc, "githubStars", { ...stars, asOf: opts.now.toISOString().slice(0, 10) }) || dirty;
    } catch (e) {
      errors.push(`${slug} stars: ${errorMessage(e)}`);
    }
    try {
      const release = await fetchLatestRelease(repo, opts.fetchFn, opts.now, opts.token);
      dirty = assignFact(doc, "latestVersion", release) || dirty;
    } catch (e) {
      errors.push(`${slug} release: ${errorMessage(e)}`);
    }
  }

  if (!dirty) return "unchanged";
  const next = AgentFacts.safeParse(doc.toJS());
  if (!next.success) {
    errors.push(`${slug}: refused to write invalid facts`);
    return "unchanged";
  }
  fs.writeFileSync(file, doc.toString(), "utf8");
  return "updated";
}

/** Updates npm downloads, GitHub stars, and the latest release tag in each facts.yaml. */
export async function refreshAgentFacts(options: RefreshOptions = {}): Promise<RefreshResult> {
  const cwd = options.cwd ?? process.cwd();
  const fetchFn = options.fetchFn ?? fetch;
  const now = options.now ?? new Date();
  const token = options.token ?? process.env.GITHUB_TOKEN;
  const dir = path.join(cwd, "content", "agents");
  const updated: string[] = [];
  const unchanged: string[] = [];
  const errors: string[] = [];

  if (!fs.existsSync(dir)) return { updated, unchanged, errors };

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(dir, entry.name, "facts.yaml");
    if (!fs.existsSync(file)) continue;
    const status = await refreshFile(file, entry.name, { fetchFn, now, token }, errors);
    (status === "updated" ? updated : unchanged).push(entry.name);
  }

  return { updated, unchanged, errors };
}
