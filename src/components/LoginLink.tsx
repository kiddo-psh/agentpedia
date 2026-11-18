"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Tiny client island: next=pathname only — no better-auth. */
export function LoginLink() {
  const pathname = usePathname();
  return (
    <Link
      href={`/login?next=${encodeURIComponent(pathname)}`}
      className="inline-flex h-9 items-center rounded-full bg-foreground px-4 font-medium text-background hover:opacity-85"
    >
      로그인
    </Link>
  );
}
