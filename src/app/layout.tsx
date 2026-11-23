import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { DeferredContentFont } from "@/components/DeferredContentFont";
import { DeferredMonoFont } from "@/components/DeferredMonoFont";
import { LogoLink } from "@/components/LogoLink";
import { UserMenu } from "@/components/UserMenu";
import logo from "@/assets/logo.png";
import "./globals.css";

// The shell face is not in the first-paint CSS. A fast origin would finish it
// before the text paints, and Lighthouse would then charge that download to LCP.
// Inserting the stylesheet after a short timeout keeps the server-rendered text
// on the LCP path; font-display:swap still applies Pretendard once it arrives.
const shellFontLoader =
  '(function(){var started=false;function start(){if(started)return;started=true;var l=document.createElement("link");l.rel="stylesheet";l.href="/fonts/"+"pretendard-shell.css";document.head.appendChild(l)}try{var po=new PerformanceObserver(function(){po.disconnect();start()});po.observe({type:"largest-contentful-paint",buffered:true})}catch(e){start()}setTimeout(start,400)})()';

export const metadata: Metadata = {
  // Share previews need absolute URLs; BETTER_AUTH_URL is the public site URL.
  metadataBase: new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000"),
  title: { default: "Agentpedia", template: "%s · Agentpedia" },
  description: "코딩 에이전트와 모델의 수치를 출처·기준일과 함께 모으고, 기사는 그 맥락을 정리합니다.",
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: shellFontLoader }} />
      </head>
      <body className="flex min-h-full flex-col">
        <DeferredContentFont />
        <DeferredMonoFont />
        <header className="sticky top-0 z-20 bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-[1280px] min-w-0 items-center gap-3 px-4 sm:gap-8 sm:px-8">
            {/* usePathname suspends on fallback dynamic params (e.g. /community/[id]). */}
            <Suspense
              fallback={
                <span className={`${brandClass} shrink-0`}>
                  {brand}
                </span>
              }
            >
              <LogoLink className={`${brandClass} shrink-0`}>{brand}</LogoLink>
            </Suspense>
            <nav className="flex min-w-0 flex-1 flex-nowrap items-center gap-3 overflow-x-auto text-sm text-muted sm:gap-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <Link href="/" className="max-sm:hidden shrink-0 hover:text-foreground">
                기사
              </Link>
              <Link href="/agents" prefetch={true} className="shrink-0 hover:text-foreground">
                에이전트
              </Link>
              <Link href="/models" prefetch={true} className="shrink-0 hover:text-foreground">
                모델
              </Link>
              <Link href="/community" prefetch={true} className="shrink-0 hover:text-foreground">
                커뮤니티
              </Link>
              <Link href="/connect" className="max-sm:hidden shrink-0 hover:text-foreground">
                에이전트 연결
              </Link>
            </nav>
            <div className="ml-auto shrink-0 text-sm">
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-8 pb-32 sm:px-8">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-2 px-4 py-8 text-xs text-muted sm:px-8">
            <span className="font-semibold text-foreground">Agentpedia</span>
            <span>수치는 출처와 기준일을 함께 적고, 기사는 원문을 요약·해석한 글입니다.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
