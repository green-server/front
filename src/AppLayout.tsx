import { Outlet, useLocation, useNavigate } from "react-router";
import { useEffect } from "react";
import { SatelliteLabels } from "@/components/SatelliteLabels";
import { NAV, TopBar } from "@/components/TopBar";
import { api, clearApiCache, useApi } from "@/lib/api";
import { LiveProvider, useLive, useLiveDropped } from "@/lib/live";
import { layoutSatellites, planetHealth, setOrbit } from "@/lib/orbit";
import type { ServerSummary } from "@/lib/types";

export function AppLayout() {
  return (
    <LiveProvider>
      <Shell />
    </LiveProvider>
  );
}

function Shell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data, reload, mutate } = useApi<ServerSummary[]>("/api/servers");

  useEffect(() => {
    const timer = setInterval(reload, 60_000);
    return () => clearInterval(timer);
  }, [reload]);

  useLive((event) => {
    if (event.type === "reconnected") reload();
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
    setOrbit({ satellites: layoutSatellites(list), health: planetHealth(list) });
  }, [data]);
  useEffect(() => () => setOrbit({ health: 1, satellites: [] }), []);

  const logout = () =>
    api("/api/auth/logout", { method: "POST" })
      .catch(() => {})
      .then(() => {
        clearApiCache();
        navigate("/login", { replace: true });
      });

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
    <>
      <a className="skip-link" href="#main">
        본문으로 건너뛰기
      </a>
      <TopBar online={data?.filter((s) => s.online).length ?? 0} total={data?.length ?? 0} onLogout={logout} />
      <LiveNotice />
      {pathname === "/" && <SatelliteLabels />}
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
    </>
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
