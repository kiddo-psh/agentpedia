import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  Idea,
  IdeasConfig,
  IdeasFile,
  IDEAS_FILE,
  IDEAS_SOURCES_FILE,
  type Idea as IdeaType,
} from "./schema";

export class IdeasError extends Error {
  constructor(public readonly problems: { where: string; issues: string[] }[]) {
    super(
      "Invalid ideas:\n" +
        problems.map((p) => `  ${p.where}\n${p.issues.map((i) => `    - ${i}`).join("\n")}`).join("\n"),
    );
  }
}

export function ideasFilePath(cwd = process.cwd()): string {
  return path.join(cwd, IDEAS_FILE);
}

export function ideasSourcesPath(cwd = process.cwd()): string {
  return path.join(cwd, IDEAS_SOURCES_FILE);
}

/** Load and validate content/ideas.yaml (empty array if missing). */
export function loadIdeas(cwd = process.cwd()): IdeaType[] {
  const file = ideasFilePath(cwd);
  if (!fs.existsSync(file)) return [];
  const raw = parseYaml(fs.readFileSync(file, "utf8")) ?? [];
  const parsed = IdeasFile.safeParse(raw);
  if (!parsed.success) {
    throw new IdeasError([
      {
        where: IDEAS_FILE,
        issues: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
      },
    ]);
  }

  const problems: { where: string; issues: string[] }[] = [];
  const slugs = new Set<string>();
  for (const [i, idea] of parsed.data.entries()) {
    if (slugs.has(idea.slug)) {
      problems.push({ where: `${IDEAS_FILE}[${i}]`, issues: [`duplicate slug "${idea.slug}"`] });
    }
    slugs.add(idea.slug);
    const one = Idea.safeParse(idea);
    if (!one.success) {
      problems.push({
        where: `${IDEAS_FILE}[${i}] (${idea.slug})`,
        issues: one.error.issues.map((x) => `${x.path.join(".") || "(root)"}: ${x.message}`),
      });
    }
  }
  if (problems.length > 0) throw new IdeasError(problems);
  return parsed.data;
}

export function loadIdeasConfig(cwd = process.cwd()): IdeasConfig {
  const file = ideasSourcesPath(cwd);
  if (!fs.existsSync(file)) {
    throw new Error(`missing ${IDEAS_SOURCES_FILE}`);
  }
  const parsed = IdeasConfig.safeParse(parseYaml(fs.readFileSync(file, "utf8")) ?? {});
  if (!parsed.success) {
    throw new IdeasError([
      {
        where: IDEAS_SOURCES_FILE,
        issues: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
      },
    ]);
  }
  return parsed.data;
}
