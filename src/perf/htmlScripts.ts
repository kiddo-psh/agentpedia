export type ScriptFailure = { kind: "inline" | "data"; where: string; error: string };

/** Parse every inline script and every `data:text/javascript` URL in built HTML. */
export function checkHtmlScripts(html: string, where = "html"): ScriptFailure[] {
  const failures: ScriptFailure[] = [];
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = scriptRe.exec(html))) {
    index += 1;
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    const src = /\bsrc="([^"]*)"/.exec(attrs)?.[1];
    if (src?.startsWith("data:text/javascript,")) {
      const error = parseScript(decodeURIComponent(src.slice("data:text/javascript,".length)));
      if (error) failures.push({ kind: "data", where: `${where} script#${index}`, error });
      continue;
    }
    if (src || !body.trim()) continue;
    if (/\btype="(?:application\/json|importmap|speculationrules)"/.test(attrs)) continue;
    const error = parseScript(body);
    if (error) failures.push({ kind: "inline", where: `${where} script#${index}`, error });
  }

  const linkRe = /<link\b[^>]*>/gi;
  let link: RegExpExecArray | null;
  let linkIndex = 0;
  while ((link = linkRe.exec(html))) {
    linkIndex += 1;
    const tag = link[0];
    if (!/\brel="preload"/.test(tag) || !/\bas="script"/.test(tag)) continue;
    const href = /\bhref="([^"]*)"/.exec(tag)?.[1];
    if (!href?.startsWith("data:text/javascript,")) continue;
    const error = parseScript(decodeURIComponent(href.slice("data:text/javascript,".length)));
    if (error) failures.push({ kind: "data", where: `${where} preload#${linkIndex}`, error });
  }
  return failures;
}

function parseScript(code: string): string | null {
  try {
    new Function(code);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
