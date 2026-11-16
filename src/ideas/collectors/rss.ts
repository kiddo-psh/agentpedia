export type RssItem = {
  title: string;
  url: string;
  publishedAt?: Date;
  author?: string;
  summary?: string;
};

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

function tag(block: string, name: string): string | undefined {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i");
  const m = block.match(re);
  return m ? decodeXml(m[1]) : undefined;
}

function attr(block: string, name: string, attrName: string): string | undefined {
  const re = new RegExp(`<${name}\\b[^>]*\\b${attrName}=["']([^"']+)["'][^>]*/?>`, "i");
  const m = block.match(re);
  return m ? decodeXml(m[1]) : undefined;
}

function parseDate(raw?: string): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Minimal RSS 2.0 / Atom item parser. Metadata only — ignores content:encoded bodies. */
export function parseFeedItems(xml: string): RssItem[] {
  const items: RssItem[] = [];

  const rssBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  for (const block of rssBlocks) {
    const title = tag(block, "title");
    const url = tag(block, "link") || tag(block, "guid");
    if (!title || !url || !/^https?:\/\//i.test(url)) continue;
    items.push({
      title,
      url,
      publishedAt: parseDate(tag(block, "pubDate") || tag(block, "dc:date")),
      author: tag(block, "author") || tag(block, "dc:creator"),
      // Prefer description; never keep content:encoded (copyright).
      summary: tag(block, "description")?.slice(0, 280),
    });
  }

  const atomBlocks = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  for (const block of atomBlocks) {
    const title = tag(block, "title");
    const url =
      attr(block, "link", "href") ||
      tag(block, "id")?.replace(/^yt:video:/, "https://www.youtube.com/watch?v=");
    if (!title || !url || !/^https?:\/\//i.test(url)) continue;
    const authorBlock = block.match(/<author\b[\s\S]*?<\/author>/i)?.[0];
    items.push({
      title,
      url,
      publishedAt: parseDate(tag(block, "published") || tag(block, "updated")),
      author: authorBlock ? tag(authorBlock, "name") : undefined,
      summary: tag(block, "summary")?.slice(0, 280) || tag(block, "media:description")?.slice(0, 280),
    });
  }

  return items;
}
