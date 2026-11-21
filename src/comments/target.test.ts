import { describe, expect, it } from "vitest";
import { commentSlugError } from "./target";

describe("commentSlugError", () => {
  it("accepts a real agent namespace and rejects an unknown one", () => {
    expect(commentSlugError("agent:claude-code")).toBeNull();
    expect(commentSlugError("agent:missing")).toMatch(/에이전트/);
    expect(commentSlugError("agent:")).toMatch(/에이전트/);
  });

  it("keeps article slugs on the article check", () => {
    expect(commentSlugError("not-a-real-article")).toMatch(/기사/);
  });
});
