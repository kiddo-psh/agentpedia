"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

/** Client-side so the header stays in the static shell. */
export function UserMenu() {
  const { data, isPending } = authClient.useSession();
  const pathname = usePathname();
  const router = useRouter();

  if (isPending) return <span className="inline-block h-4 w-14" aria-hidden />;

  if (!data) {
    return (
      <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="hover:text-foreground">
        로그인
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-3">
      <Link href="/likes" className="hover:text-foreground">
        좋아요한 글
      </Link>
      <span className="text-foreground">{data.user.name}</span>
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
