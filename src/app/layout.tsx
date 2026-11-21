import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { DeferredContentFont } from "@/components/DeferredContentFont";
import { DeferredMonoFont } from "@/components/DeferredMonoFont";
import { LogoLink } from "@/components/LogoLink";
import { UserMenu } from "@/components/UserMenu";
import logo from "@/assets/logo.png";
// Critical Pretendard only on first paint; content face via DeferredContentFont.
// Regenerate both CSS files: npm run fonts:subset
import "./pretendard-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  // Share previews need absolute URLs; BETTER_AUTH_URL is the public site URL.
  metadataBase: new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000"),
  title: { default: "Agentpedia", template: "%s · Agentpedia" },
  description: "AI 에이전트 시대의 인사이트를 읽고, 내 프로젝트에 바로 적용해 보세요.",
};

const brandClass = "flex items-center gap-2 text-[17px] font-semibold tracking-tight";
// Black disc vanishes on the dark background, so invert it there.
const brand = (
  <>
    <Image src={logo} alt="" width={28} height={28} preload className="dark:invert" />
    Agentpedia
  </>
);

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <DeferredContentFont />
        <DeferredMonoFont />
        <header className="sticky top-0 z-20 bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-8 px-4 sm:px-8">
            {/* usePathname suspends on fallback dynamic params (e.g. /community/[id]). */}
            <Suspense
              fallback={
                <span className={brandClass}>
                  {brand}
                </span>
              }
            >
              <LogoLink className={brandClass}>{brand}</LogoLink>
            </Suspense>
            <nav className="flex gap-6 text-sm text-muted">
              <Link href="/" className="max-sm:hidden hover:text-foreground">
                기사
              </Link>
              <Link href="/agents" prefetch={true} className="hover:text-foreground">
                에이전트
              </Link>
              <Link href="/community" prefetch={true} className="hover:text-foreground">
                커뮤니티
              </Link>
              <Link href="/connect" className="max-sm:hidden hover:text-foreground">
                에이전트 연결
              </Link>
            </nav>
            <div className="ml-auto text-sm">
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-8 pb-32 sm:px-8">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-2 px-4 py-8 text-xs text-muted sm:px-8">
            <span className="font-semibold text-foreground">Agentpedia</span>
            <span>모든 기사는 원문 출처를 밝히고 요약·해석한 글입니다.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
