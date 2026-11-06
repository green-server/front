"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { api } from "@/lib/api";
import { LiveProvider, useLiveDropped } from "@/lib/live";

const NAV = [
  { href: "/", label: "서버" },
  { href: "/reports", label: "절약 리포트" },
  { href: "/account", label: "계정" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () =>
    api("/api/auth/logout", { method: "POST" })
      .catch(() => {})
      .then(() => router.replace("/login"));

  return (
    <LiveProvider>
      <a className="skip-link" href="#main">
        본문으로 건너뛰기
      </a>
      <header className="top">
        <Link href="/" className="wordmark">
          Green Server
        </Link>
        <nav aria-label="주 메뉴">
          {NAV.map(({ href, label }) => {
            const current = href === "/" ? pathname === "/" || pathname.startsWith("/servers") : pathname.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={current ? "page" : undefined}>
                {label}
              </Link>
            );
          })}
          <button type="button" className="link-button" onClick={logout}>
            로그아웃
          </button>
        </nav>
      </header>
      <LiveNotice />
      <main id="main" tabIndex={-1} className="page">
        {children}
      </main>
    </LiveProvider>
  );
}

function LiveNotice() {
  const dropped = useLiveDropped();
  return (
    <div role="status">
      {dropped && <p className="live-notice">실시간 연결이 끊겼습니다. 다시 연결하는 중이며, 화면의 값은 최신이 아닐 수 있습니다.</p>}
    </div>
  );
}
