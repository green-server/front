import { Link, useLocation } from "react-router";
import { Logo } from "@/components/Logo";

export const NAV = [
  { href: "/", label: "홈", path: "m3 10 9-7 9 7v10H3V10Zm6 10v-7h6v7" },
  { href: "/servers", label: "서버", path: "M4 3h16v7H4zM4 14h16v7H4zM7 6.5h.01M7 17.5h.01M12 6.5h5M12 17.5h5" },
  { href: "/reports", label: "절약 리포트", path: "M4 3v18h17M9 16v-5m5 5V7m5 9V4" },
  { href: "/account", label: "계정", path: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 6 0 0 1 16 0v2" },
];

const isCurrent = (href: string, pathname: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

function Links({ pathname }: { pathname: string }) {
  return NAV.map(({ href, label, path }) => (
    <Link key={href} to={href} aria-current={isCurrent(href, pathname) ? "page" : undefined}>
      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>
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
          <Logo />
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
