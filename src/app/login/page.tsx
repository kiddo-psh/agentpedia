import type { Metadata } from "next";
import { Suspense } from "react";
import { devPasswordLogin, githubLogin } from "@/lib/auth-config";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm pt-16">
      <h1 className="text-4xl font-medium tracking-[-0.03em]">로그인</h1>
      <p className="mt-2 text-sm text-muted">댓글로 토론에 참여하려면 로그인하세요.</p>
      {/* LoginForm reads ?next= from the URL, which is request data. */}
      <Suspense>
        <LoginForm github={githubLogin} devPassword={devPasswordLogin} />
      </Suspense>
    </div>
  );
}
