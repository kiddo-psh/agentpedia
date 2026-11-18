"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Header brand link. Next.js skips same-route navigations, so on `/` (e.g. scrolled
 * into 모든 기사 or `/#articles`) a plain `Link href="/"` would do nothing.
 */
export function LogoLink({ className, children }: { className?: string; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <Link
      href="/"
      className={className}
      onClick={() => {
        if (pathname === "/") window.scrollTo({ top: 0 });
      }}
    >
      {children}
    </Link>
  );
}
