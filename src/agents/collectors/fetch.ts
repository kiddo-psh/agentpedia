export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

const DEFAULT_UA = "AgentpediaAgentBot/0.1 (+https://github.com; agent fact collector)";

/** JSON GET. Callers parse the body with a schema; this only checks the status. */
export async function fetchJson(url: string, fetchFn: FetchFn, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetchFn(url, {
    headers: { "user-agent": DEFAULT_UA, accept: "application/json", ...headers },
  });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json() as Promise<unknown>;
}
