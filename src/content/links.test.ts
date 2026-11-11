import { describe, expect, it } from "vitest";
import { sourceUrlAt } from "./links";
import type { Source } from "./schema";

const source = (url: string): Source => ({
  id: "s",
  title: "t",
  url,
  author: "a",
  kind: "video",
  publishedAt: new Date("2026-01-01"),
});

describe("sourceUrlAt", () => {
  it("adds t= seconds to YouTube links, keeping existing params", () => {
    expect(sourceUrlAt(source("https://www.youtube.com/watch?v=abc"), "1:02:03")).toBe(
      "https://www.youtube.com/watch?v=abc&t=3723",
    );
  });

  it("leaves non-seekable hosts untouched", () => {
    expect(sourceUrlAt(source("https://podcasts.example.com/ep/1"), "12:34")).toBe(
      "https://podcasts.example.com/ep/1",
    );
  });

  it("returns the plain url without a timestamp", () => {
    expect(sourceUrlAt(source("https://www.youtube.com/watch?v=abc"))).toBe(
      "https://www.youtube.com/watch?v=abc",
    );
  });
});
