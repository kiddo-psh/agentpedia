"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

/** Only same-site paths, so ?next= cannot redirect off the site. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function LoginForm({ github, devPassword }: { github: boolean; devPassword: boolean }) {
  const next = safeNext(useSearchParams().get("next"));
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function devLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name"));
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const signIn = await authClient.signIn.email({ email, password });
    const result = signIn.error ? await authClient.signUp.email({ name, email, password }) : signIn;
    setBusy(false);
    if (result.error) return setError(result.error.message ?? "로그인에 실패했습니다.");
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mt-8 grid gap-6">
      {github && (
        <button
          type="button"
          onClick={() => authClient.signIn.social({ provider: "github", callbackURL: next })}
          className="rounded-lg bg-foreground px-4 py-2.5 font-semibold text-background hover:opacity-90"
        >
          GitHub로 로그인
        </button>
      )}

      {devPassword && (
        <form onSubmit={devLogin} className="grid gap-3 rounded-xl border border-dashed border-amber-500/50 p-4">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            개발용 로그인입니다. GitHub OAuth 설정이 없을 때 개발 환경에서만 보입니다. 처음이면 계정이 만들어집니다.
          </p>
          <input name="name" placeholder="이름" required className="rounded-md border border-foreground/15 bg-background px-3 py-2" />
          <input name="email" type="email" placeholder="이메일" required className="rounded-md border border-foreground/15 bg-background px-3 py-2" />
          <input
            name="password"
            type="password"
            placeholder="비밀번호 (8자 이상)"
            minLength={8}
            required
            className="rounded-md border border-foreground/15 bg-background px-3 py-2"
          />
          <button disabled={busy} className="rounded-lg bg-foreground px-4 py-2 font-semibold text-background disabled:opacity-50">
            {busy ? "처리 중…" : "개발용 로그인"}
          </button>
        </form>
      )}

      {!github && !devPassword && (
        <p className="text-sm text-muted">로그인이 아직 설정되지 않았습니다.</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
