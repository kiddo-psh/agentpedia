import fs from "node:fs";
import { stringify } from "yaml";
import type { Idea } from "./schema";
import { ideasFilePath } from "./load";

const HEADER = `# Article ideas not yet written.
# slug, topic, category, people and sources match the write-article skill args,
# so an entry can be passed to the skill as is.
# Remove an entry once its article lands under content/articles/.
#
# status: idea | picked | dropped
# primaryVerified: whether the researcher opened a first-hand source.
#   The writer still re-checks every URL and date (docs/writing-guide.md).
#
# Auto-collected rows set primaryVerified: false and confidence: low.
# Humans shortlist (status: picked), fill kitIdea/tension if needed, then run write-article.

`;

function toYamlDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Serialize ideas for disk; dates as YYYY-MM-DD. */
export function serializeIdeas(ideas: Idea[]): string {
  const plain = ideas.map((idea) => {
    const row: Record<string, unknown> = {
      slug: idea.slug,
      topic: idea.topic,
      category: idea.category,
      people: idea.people,
      sources: idea.sources,
    };
    if (idea.publishedAt) row.publishedAt = toYamlDate(idea.publishedAt);
    if (idea.sourceKind) row.sourceKind = idea.sourceKind;
    row.tension = idea.tension;
    row.kitIdea = idea.kitIdea;
    row.primaryVerified = idea.primaryVerified;
    row.confidence = idea.confidence;
    row.status = idea.status;
    if (idea.note) row.note = idea.note;
    if (idea.score !== undefined) row.score = idea.score;
    if (idea.collectedAt) row.collectedAt = toYamlDate(idea.collectedAt);
    return row;
  });
  return HEADER + stringify(plain, { lineWidth: 0 });
}

export function writeIdeas(ideas: Idea[], cwd = process.cwd()): void {
  const file = ideasFilePath(cwd);
  fs.writeFileSync(file, serializeIdeas(ideas), "utf8");
}
