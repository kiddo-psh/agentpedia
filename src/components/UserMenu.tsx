import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getRenderSession } from "@/lib/auth";
import { LoginLink } from "./LoginLink";
import { SignOutButton } from "./SignOutButton";

/** Header chrome: SSR session behind Suspense so the layout shell stays prerenderable. */
export function UserMenu() {
  return (
    <Suspense fallback={<span className="inline-block h-9 w-16" aria-hidden />}>
      <UserMenuSession />
    </Suspense>
  );
}

async function UserMenuSession() {
  await connection();
  let session: Awaited<ReturnType<typeof getRenderSession>> = null;
  try {
    session = await getRenderSession();
  } catch (err) {
    // Auth must not take the page down; fall through to the login link.
    console.error("[auth] UserMenu session failed", err);
  }

  if (!session) return <LoginLink />;

  return (
    <span className="flex items-center gap-4 text-muted">
      <Link href="/likes" className="hover:text-foreground">
        좋아요한 글
      </Link>
      <span className="text-foreground max-sm:hidden">{session.user.name}</span>
      <SignOutButton />
    </span>
  );
}
