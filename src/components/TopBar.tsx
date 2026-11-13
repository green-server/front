import { Link, useLocation } from "react-router";

export const NAV = [
  { href: "/", label: "홈" },
  { href: "/servers", label: "서버" },
  { href: "/reports", label: "절약 리포트" },
  { href: "/account", label: "계정" },
];

const isCurrent = (href: string, pathname: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

function Links({ pathname }: { pathname: string }) {
  return NAV.map(({ href, label }) => (
    <Link key={href} to={href} aria-current={isCurrent(href, pathname) ? "page" : undefined}>
      {label}
    </Link>
  ));
}

export function TopBar({ online, total, onLogout }: { online: number; total: number; onLogout: () => void }) {
  const { pathname } = useLocation();
  return (
    <>
      <header className="topbar">
        <Link to="/" className="topbar-brand">
          {/* The page icon itself, so the bar and the browser tab show the same mark. */}
          <img className="topbar-mark" src="/icon.svg?v=leaf" alt="" />
          Green Server
        </Link>
        <nav className="pills" aria-label="주 메뉴">
          <Links pathname={pathname} />
        </nav>
        <div className="topbar-end">
          <span className="topbar-count">
            {online}/{total} 연결
          </span>
          <button type="button" className="btn btn-quiet" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </header>
      <nav className="tabbar" aria-label="하단 메뉴">
        <Links pathname={pathname} />
      </nav>
    </>
  );
}
