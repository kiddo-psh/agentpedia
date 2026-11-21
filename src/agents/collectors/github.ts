import { z } from "zod";
import { fetchJson, type FetchFn } from "./fetch";

const Repo = z.object({
  stargazers_count: z.number().int().nonnegative(),
});

const Release = z.object({
  tag_name: z.string().min(1),
  html_url: z.url(),
  published_at: z.string().nullable().optional(),
});

export type GithubRepo = { owner: string; repo: string };

export function githubRepo(repoUrl: string): GithubRepo | null {
  let url: URL;
  try {
    url = new URL(repoUrl);
  } catch {
    return null;
  }
  if (url.hostname !== "github.com") return null;
  const [owner, repo] = url.pathname.split("/").filter(Boolean);
  if (!owner || !repo) return null;
  return { owner, repo: repo.replace(/\.git$/, "") };
}

export type GithubStars = { value: number; sourceUrl: string };

export type GithubRelease = { value: string; sourceUrl: string; asOf: string };

function headers(token: string | undefined): Record<string, string> {
  return {
    accept: "application/vnd.github+json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchGithubStars(
  repo: GithubRepo,
  fetchFn: FetchFn,
  token?: string,
): Promise<GithubStars> {
  const sourceUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}`;
  const data = Repo.parse(await fetchJson(sourceUrl, fetchFn, headers(token)));
  return { value: data.stargazers_count, sourceUrl };
}

/** `/releases/latest` skips drafts and prereleases. asOf is the UTC publish date. */
export async function fetchLatestRelease(
  repo: GithubRepo,
  fetchFn: FetchFn,
  now: Date,
  token?: string,
): Promise<GithubRelease> {
  const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/releases/latest`;
  const data = Release.parse(await fetchJson(url, fetchFn, headers(token)));
  const published = data.published_at?.slice(0, 10);
  const asOf = published && /^\d{4}-\d{2}-\d{2}$/.test(published) ? published : now.toISOString().slice(0, 10);
  return { value: data.tag_name, sourceUrl: data.html_url, asOf };
}
