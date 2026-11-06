"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { api, clearApiCache } from "@/lib/api";
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
      .then(() => {
        clearApiCache();
        router.replace("/login");
      });

  // The window numbers in the bar are real keys, as they are in tmux.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return;
      if ((event.target as HTMLElement).closest("input, select, textarea")) return;
      const item = NAV[Number(event.key) - 1];
      if (item) router.push(item.href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <LiveProvider>
      <a className="skip-link" href="#main">
        본문으로 건너뛰기
      </a>
      <header className="bar">
        <Link href="/" className="wordmark">
          <Logo />
        </Link>
        <nav aria-label="주 메뉴">
          {NAV.map(({ href, label }, index) => {
            const current = href === "/" ? pathname === "/" || pathname.startsWith("/servers") : pathname.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={current ? "page" : undefined}>
                <span className="bar-key">{index + 1}</span>
                {label}
              </Link>
            );
          })}
        </nav>
        <Clock />
        <button type="button" className="link-button" onClick={logout}>
          로그아웃
        </button>
      </header>
      <LiveNotice />
      <main id="main" tabIndex={-1} className="page">
        {children}
      </main>
    </LiveProvider>
  );
}

const clockFormat = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const onSecond = (tick: () => void) => {
  const timer = setInterval(tick, 1000);
  return () => clearInterval(timer);
};

function Clock() {
  const now = useSyncExternalStore(onSecond, () => clockFormat.format(Date.now()), () => "");
  return <span className="bar-clock">{now}</span>;
}

function LiveNotice() {
  const dropped = useLiveDropped();
  return (
    <div role="status">
      {dropped && <p className="live-notice">실시간 연결이 끊겼습니다. 다시 연결하는 중이며, 화면의 값은 최신이 아닐 수 있습니다.</p>}
    </div>
  );
}
