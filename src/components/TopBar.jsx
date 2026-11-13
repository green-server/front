import { Link, useLocation } from "react-router-dom";
import styled, { css } from "styled-components";

export const NAV = [
  { href: "/", label: "홈" },
  { href: "/servers", label: "서버" },
  { href: "/reports", label: "절약 리포트" },
  { href: "/account", label: "계정" },
];

const isCurrent = (href, pathname) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

function Links({ pathname }) {
  return NAV.map(({ href, label }) => (
    <Link key={href} to={href} aria-current={isCurrent(href, pathname) ? "page" : undefined}>
      {label}
    </Link>
  ));
}

export function TopBar({ online, total, onLogout }) {
  const { pathname } = useLocation();
  return (
    <>
      <Bar>
        <Brand to="/">
          {/* The page icon itself, so the bar and the browser tab show the same mark. */}
          <Mark src="/icon.svg?v=leaf" alt="" />
          Green Server
        </Brand>
        <Pills aria-label="주 메뉴">
          <Links pathname={pathname} />
        </Pills>
        <End>
          <Count>
            {online}/{total} 연결
          </Count>
          <button type="button" className="btn btn-quiet" onClick={onLogout}>
            로그아웃
          </button>
        </End>
      </Bar>
      <Tabbar aria-label="하단 메뉴">
        <Links pathname={pathname} />
      </Tabbar>
    </>
  );
}

const Bar = styled.header`
  position: fixed;
  inset: 0 0 auto;
  z-index: 20;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  height: var(--bar-h);
  padding: 0 2ch;

  @media (max-width: 759.98px) {
    background: var(--paper);
    grid-template-columns: 1fr auto;
  }
`;

const Brand = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 1ch;
  justify-self: start;
  font-weight: 700;
  text-decoration: none;
`;

const Mark = styled.img`
  width: 1lh;
  height: 1lh;
`;

// Shared by the bar and the tab bar.
const menuLinks = css`
  & a {
    padding: 0 1ch;
    color: var(--ink-2);
    text-decoration: none;
  }
  & a:hover {
    color: var(--ink);
  }
  & a[aria-current="page"] {
    background: var(--ink);
    color: var(--paper);
    font-weight: 700;
  }
  & a:focus-visible {
    outline-offset: 0;
  }
`;

/* A menu bar: items in a row, the current one reversed. */
const Pills = styled.nav`
  display: flex;
  gap: 1ch;
  ${menuLinks}

  @media (max-width: 759.98px) {
    display: none;
  }
`;

const End = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2ch;
  color: var(--ink-2);
`;

const Count = styled.span`
  @media (max-width: 759.98px) {
    display: none;
  }
`;

const Tabbar = styled.nav`
  display: none;
  ${menuLinks}

  @media (max-width: 759.98px) {
    position: fixed;
    inset: auto 0 0;
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    align-items: center;
    height: var(--tabs-h);
    border-top: 1px solid var(--line);
    background: var(--paper);

    & a {
      justify-self: center;
      white-space: nowrap;
    }
  }
`;
