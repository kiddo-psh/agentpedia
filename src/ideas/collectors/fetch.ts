export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

const DEFAULT_UA = "AgentpediaIdeaBot/0.1 (+https://github.com; idea collector; metadata only)";

/** Thin wrapper so collectors stay testable with an injected fetch. */
export async function fetchText(url: string, fetchFn: FetchFn = fetch): Promise<string> {
  const res = await fetchFn(url, {
    headers: { "user-agent": DEFAULT_UA, accept: "application/rss+xml, application/atom+xml, application/json, text/html, */*" },
  });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
}

export async function fetchJson<T>(url: string, fetchFn: FetchFn = fetch): Promise<T> {
  const res = await fetchFn(url, {
    headers: { "user-agent": DEFAULT_UA, accept: "application/json" },
  });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}
