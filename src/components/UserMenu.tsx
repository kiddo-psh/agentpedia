"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

/** Client-side so the header stays in the static shell. */
export function UserMenu() {
  const { data, isPending } = authClient.useSession();
  const pathname = usePathname();
  const router = useRouter();

  if (isPending) return <span className="inline-block h-9 w-16" aria-hidden />;

  if (!data) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        className="inline-flex h-9 items-center rounded-full bg-foreground px-4 font-medium text-background hover:opacity-85"
      >
        로그인
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-4 text-muted">
      <Link href="/likes" className="hover:text-foreground">
        좋아요한 글
      </Link>
      <span className="text-foreground max-sm:hidden">{data.user.name}</span>
      <button
        type="button"
        className="hover:text-foreground"
        onClick={async () => {
          await authClient.signOut();
          router.refresh();
        }}
      >
        로그아웃
      </button>
    </span>
  );
}
