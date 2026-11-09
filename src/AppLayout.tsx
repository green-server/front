import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useEffect, useSyncExternalStore } from "react";
import { Logo } from "@/components/Logo";
import { api, clearApiCache, useApi } from "@/lib/api";
import { LiveProvider, useLiveDropped } from "@/lib/live";
import { planetHealth, setPlanetHealth } from "@/lib/planet";
import type { ServerSummary } from "@/lib/types";

const NAV = [
  { href: "/", label: "서버" },
  { href: "/reports", label: "절약 리포트" },
  { href: "/account", label: "계정" },
];

/** Feeds the background planet the fleet's draw; signed out, it goes back to green. */
function PlanetFeed() {
  const { data, reload } = useApi<ServerSummary[]>("/api/servers");
  useEffect(() => {
    const timer = setInterval(reload, 60_000);
    return () => clearInterval(timer);
  }, [reload]);
  useEffect(() => setPlanetHealth(planetHealth(data)), [data]);
  useEffect(() => () => setPlanetHealth(1), []);
  return null;
}

export function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const logout = () =>
    api("/api/auth/logout", { method: "POST" })
      .catch(() => {})
      .then(() => {
        clearApiCache();
        navigate("/login", { replace: true });
      });

  // The window numbers in the bar are real keys, as they are in tmux.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return;
      if ((event.target as HTMLElement).closest("input, select, textarea")) return;
      const item = NAV[Number(event.key) - 1];
      if (item) navigate(item.href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <LiveProvider>
      <PlanetFeed />
      <a className="skip-link" href="#main">
        본문으로 건너뛰기
      </a>
      <header className="bar">
        <Link to="/" className="wordmark">
          <Logo />
        </Link>
        <nav aria-label="주 메뉴">
          {NAV.map(({ href, label }, index) => {
            const current = href === "/" ? pathname === "/" || pathname.startsWith("/servers") : pathname.startsWith(href);
            return (
              <Link key={href} to={href} aria-current={current ? "page" : undefined}>
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
        {/* Keyed by path so each navigation remounts it and replays the entrance. */}
        <div className="route" key={pathname}>
          <Outlet />
        </div>
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
