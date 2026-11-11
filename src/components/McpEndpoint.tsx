"use client";

import { useSyncExternalStore } from "react";
import { CopyButton } from "@/components/CopyButton";

const subscribe = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "https://<사이트 주소>";

/** The page is static, so the endpoint origin is read in the browser. */
export function useMcpUrl() {
  return `${useSyncExternalStore(subscribe, getOrigin, getServerOrigin)}/mcp`;
}

/** A copyable code block; `template` may contain {url}, replaced with this site's /mcp endpoint. */
export function McpSnippet({ template, label }: { template: string; label?: string }) {
  const code = template.replaceAll("{url}", useMcpUrl());
  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl border border-foreground/15">
      <div className="flex items-center justify-between gap-3 border-b border-foreground/10 bg-foreground/[.03] px-4 py-2">
        <span className="text-xs font-medium text-muted">{label ?? "명령어"}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-sm leading-relaxed">{code}</pre>
    </div>
  );
}
