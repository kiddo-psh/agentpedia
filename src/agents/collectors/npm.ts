import { z } from "zod";
import { fetchJson, type FetchFn } from "./fetch";

const NpmPoint = z.object({
  downloads: z.number().nonnegative(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  package: z.string().min(1),
});

export type NpmWeekly = {
  value: number;
  sourceUrl: string;
  asOf: string;
};

/** npm's last-week window. sourceUrl pins the start:end range so the number stays checkable. */
export async function fetchNpmWeekly(pkg: string, fetchFn: FetchFn): Promise<NpmWeekly> {
  const data = NpmPoint.parse(await fetchJson(`https://api.npmjs.org/downloads/point/last-week/${pkg}`, fetchFn));
  return {
    value: data.downloads,
    sourceUrl: `https://api.npmjs.org/downloads/point/${data.start}:${data.end}/${data.package}`,
    asOf: data.end,
  };
}
