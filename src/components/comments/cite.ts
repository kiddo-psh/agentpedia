/** Custom event + detail shape for article prose → comment form citations. */
export const CITE_EVENT = "agentpedia:cite";

export type CiteDetail = { quote: string };

export function dispatchCite(quote: string) {
  window.dispatchEvent(new CustomEvent<CiteDetail>(CITE_EVENT, { detail: { quote } }));
}
