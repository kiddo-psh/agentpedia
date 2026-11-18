"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Loads better-auth only when the user clicks logout. */
export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      className="hover:text-foreground disabled:opacity-50"
      onClick={async () => {
        setBusy(true);
        try {
          const { authClient } = await import("@/lib/auth-client");
          await authClient.signOut();
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      로그아웃
    </button>
  );
}
