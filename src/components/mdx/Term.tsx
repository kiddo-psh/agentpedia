import type { ReactNode } from "react";
import type { GlossaryEntry } from "@/content/schema";
import { TermPopover } from "./TermPopover";

/** Inline glossary mark that opens its definition in a popover. The validator guarantees `id` exists. */
export function makeTerm(terms: GlossaryEntry[]) {
  const byId = new Map(terms.map((t) => [t.id, t]));

  return function Term({ id, children }: { id: string; children: ReactNode }) {
    return <TermPopover entry={byId.get(id)!}>{children}</TermPopover>;
  };
}
