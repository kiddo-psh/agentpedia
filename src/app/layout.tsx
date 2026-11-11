import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { UserMenu } from "@/components/UserMenu";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Agentpedia", template: "%s · Agentpedia" },
  description: "AI 에이전트 시대의 인사이트를 읽고, 내 프로젝트에 바로 적용해 보세요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-foreground/10">
          <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="font-semibold tracking-tight">
              Agentpedia
            </Link>
            <nav className="flex gap-5 text-sm text-muted">
              <Link href="/" className="hover:text-foreground">
                기사
              </Link>
              <Link href="/connect" className="hover:text-foreground">
                에이전트 연결
              </Link>
              <UserMenu />
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">{children}</main>
        <footer className="border-t border-foreground/10 py-6 text-center text-xs text-muted">
          모든 기사는 원문 출처를 밝히고 요약·해석한 글입니다.
        </footer>
      </body>
    </html>
  );
}
