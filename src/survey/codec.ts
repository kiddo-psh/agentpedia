/** `model` is a text column. Multi-select is a JSON array so the table did not need a new column. */
export function encodeModelIds(ids: readonly string[]): string {
  return JSON.stringify([...new Set(ids)].sort());
}

export function decodeModelIds(stored: string): string[] {
  if (stored.startsWith("[")) {
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) return parsed;
    } catch {
      // A plain slug from an older row.
    }
  }
  return stored ? [stored] : [];
}

/** `agent_other` stays text. The two free-text boxes share one JSON object. */
export function encodeAgentOther(parts: {
  orchestrator?: string | null;
  other?: string | null;
}): string | null {
  const body: Record<string, string> = {};
  if (parts.orchestrator) body.orchestrator = parts.orchestrator;
  if (parts.other) body.other = parts.other;
  return Object.keys(body).length > 0 ? JSON.stringify(body) : null;
}
