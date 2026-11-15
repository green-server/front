import { Outlet, useNavigate, useOutletContext } from "react-router-dom";
import { useEffect } from "react";
import styled from "styled-components";
import { NAV, TopBar } from "@/components/TopBar";
import { api, clearApiCache, useApi } from "@/lib/api";
import { LiveProvider, useLive, useLiveDropped } from "@/lib/live";
import { planetBlight, planetHealth, setOrbit } from "@/lib/orbit";

/**
 * The fleet list AppLayout keeps live; pages read it instead of fetching their own copy.
 * `{ servers, error, staleError, reload }`: `servers` is undefined until the first answer arrives.
 */
export const useServers = () => useOutletContext();

export function AppLayout() {
  return (
    <LiveProvider>
      <Shell />
    </LiveProvider>
  );
}

function Shell() {
  const navigate = useNavigate();
  const { data, error, staleError, reload, mutate } = useApi("/api/servers");
  // Open recommendations ravage the planet; applying or dismissing one heals it.
  const activity = useApi("/api/reports/activity");
  const reloadActivity = activity.reload;

  useEffect(() => {
    const timer = setInterval(() => {
      reload();
      reloadActivity();
    }, 60_000);
    return () => clearInterval(timer);
  }, [reload, reloadActivity]);

  useLive((event) => {
    if (event.type === "reconnected") reload();
    if (event.type === "reconnected" || event.type === "consultation" || event.type === "tool_call") reloadActivity();
    if (event.type === "metric") {
      const { watts, isEstimated } = event.metric;
      mutate((list) => list.map((s) => (s.id === event.serverId ? { ...s, latestWatts: watts, isEstimated } : s)));
    }
    if (event.type === "agent_status") {
      mutate((list) => list.map((s) => (s.id === event.serverId ? { ...s, online: event.online } : s)));
    }
  });

  useEffect(() => {
    const list = data ?? [];
    setOrbit({ health: planetHealth(list) });
  }, [data]);
  useEffect(() => setOrbit({ blight: planetBlight(activity.data) }), [activity.data]);
  useEffect(() => () => setOrbit({ health: 1, blight: 0 }), []);

  const logout = () =>
    api("/api/auth/logout", { method: "POST" })
      .catch(() => {})
      .then(() => {
        clearApiCache();
        navigate("/login", { replace: true });
      });

  useEffect(() => {
    // Alt/Option + 1..4. `code`, not `key`: on a Mac, Option+digit types a symbol.
    const onKey = (event) => {
      const digit = /^Digit([1-4])$/.exec(event.code);
      if (!digit || !event.altKey || event.metaKey || event.ctrlKey || event.shiftKey || event.isComposing) return;
      if (event.target.closest("input, select, textarea")) return;
      // `data-keep` marks a screen that cannot be shown again, such as the one-time agent token.
      if (document.querySelector("[data-keep]")) return;
      event.preventDefault();
      navigate(NAV[digit[1] - 1].href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <>
      <SkipLink href="#main">본문으로 건너뛰기</SkipLink>
      <TopBar online={data?.filter((s) => s.online).length ?? 0} total={data?.length ?? 0} onLogout={logout} />
      <LiveNotice />
      <Main id="main" tabIndex={-1}>
        <Outlet context={{ servers: data, error, staleError, reload }} />
      </Main>
    </>
  );
}

function LiveNotice() {
  const dropped = useLiveDropped();
  return (
    <div role="status">
      {/* index.css reads the class: :root:has(.live-notice) makes room for it. */}
      {dropped && <Notice className="live-notice">연결이 끊겨 다시 연결하는 중입니다. 값이 최신이 아닐 수 있습니다.</Notice>}
    </div>
  );
}

const SkipLink = styled.a`
  &:not(:focus) {
    position: absolute;
    left: -9999px;
  }
`;

const Notice = styled.p`
  position: fixed;
  top: var(--bar-h);
  left: 50%;
  z-index: 30;
  max-width: calc(100vw - 4ch);
  transform: translateX(-50%);
  margin: 0;
  padding: 0 1ch;
  white-space: nowrap;
  background: var(--warn);
  color: var(--paper);
  font-weight: 700;

  @media (max-width: 759.98px) {
    width: calc(100vw - 4ch);
    white-space: normal;
  }
`;

const Main = styled.main`
  &#main {
    outline: none;
  }
`;
