import { describe, expect, it } from "vitest";
import { commentSlugError } from "./target";

describe("commentSlugError", () => {
  it("accepts a real model namespace and rejects an unknown one", () => {
    expect(commentSlugError("model:opus-5-5")).toBeNull();
    expect(commentSlugError("model:missing")).toMatch(/모델/);
  });

  it("accepts a real agent namespace", () => {
    expect(commentSlugError("agent:claude-code")).toBeNull();
    expect(commentSlugError("agent:missing")).toMatch(/에이전트/);
  });

  it("keeps article slugs on the article check", () => {
    expect(commentSlugError("not-a-real-article")).toMatch(/기사/);
  });
});
