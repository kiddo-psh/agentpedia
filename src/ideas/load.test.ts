import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadIdeas } from "./load";

describe("loadIdeas", () => {
  it("loads the repo content/ideas.yaml backlog", () => {
    const file = path.join(process.cwd(), "content", "ideas.yaml");
    expect(fs.existsSync(file)).toBe(true);
    const ideas = loadIdeas();
    expect(ideas.length).toBeGreaterThanOrEqual(8);
    const row = ideas.find((i) => i.slug === "cursor-incident-credential-chain-followup");
    expect(row).toMatchObject({
      category: "security",
      status: "idea",
      primaryVerified: true,
      confidence: "high",
    });
    expect(row?.sources[0]).toMatch(/^https:/);
    // write-article handoff fields present
    expect(row).toHaveProperty("topic");
    expect(row).toHaveProperty("people");
    // landed articles must leave the backlog
    expect(ideas.some((i) => i.slug === "persistent-agents-trusted-control-plane")).toBe(false);
    expect(ideas.some((i) => i.slug === "cursor-long-agent-token-economics")).toBe(false);
  });
});
