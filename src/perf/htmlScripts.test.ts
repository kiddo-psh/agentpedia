import { describe, expect, it } from "vitest";
import { checkHtmlScripts } from "./htmlScripts";

const goodLoader = encodeURIComponent(
  '(function(){var s=["/a.js"];setTimeout(function(){},400)})()',
);
const brokenLoader = encodeURIComponent(
  '(function(){var s=["/a.js"];setTimeout(function(){},400))()',
);

describe("checkHtmlScripts", () => {
  it("accepts a closed bootstrap data URL", () => {
    const html = `<script src="data:text/javascript,${goodLoader}" id="_R_" async=""></script>`;
    expect(checkHtmlScripts(html)).toEqual([]);
  });

  it("fails the preload and the script tag when the loader drops its closing brace", () => {
    const html = [
      `<link rel="preload" as="script" fetchPriority="low" href="data:text/javascript,${brokenLoader}"/>`,
      `<script src="data:text/javascript,${brokenLoader}" id="_R_" async=""></script>`,
      `<script>setTimeout(function(){},400)</script>`,
    ].join("");
    const failures = checkHtmlScripts(html);
    expect(failures.map((failure) => failure.kind)).toEqual(["data", "data"]);
    expect(failures.every((failure) => failure.error.includes("Unexpected token"))).toBe(true);
  });
});
