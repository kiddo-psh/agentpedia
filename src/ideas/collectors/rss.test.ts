import { describe, expect, it } from "vitest";
import { parseFeedItems } from "./rss";

describe("parseFeedItems", () => {
  it("reads RSS items without content:encoded bodies", () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title><![CDATA[Hello Agent]]></title>
          <link>https://example.com/hello</link>
          <pubDate>Mon, 10 Nov 2026 00:00:00 GMT</pubDate>
          <description>Short blurb</description>
          <content:encoded><![CDATA[<p>FULL COPYRIGHT TEXT SHOULD NOT BE STORED</p>]]></content:encoded>
        </item>
      </channel></rss>`;
    const items = parseFeedItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: "Hello Agent", url: "https://example.com/hello" });
    expect(JSON.stringify(items)).not.toMatch(/FULL COPYRIGHT/);
  });

  it("reads YouTube Atom entries", () => {
    const xml = `<?xml version="1.0"?>
      <feed xmlns:media="http://search.yahoo.com/mrss/">
        <entry>
          <title>Talk about agents</title>
          <link rel="alternate" href="https://www.youtube.com/watch?v=abc"/>
          <published>2026-11-01T12:00:00+00:00</published>
          <author><name>Anthropic</name></author>
          <media:group><media:description>desc</media:description></media:group>
        </entry>
      </feed>`;
    const items = parseFeedItems(xml);
    expect(items[0]?.url).toBe("https://www.youtube.com/watch?v=abc");
    expect(items[0]?.author).toBe("Anthropic");
  });
});
