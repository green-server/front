import { Outlet, useNavigate, useOutletContext } from "react-router";
import { useEffect } from "react";
import { NAV, TopBar } from "@/components/TopBar";
import { api, clearApiCache, useApi } from "@/lib/api";
import { LiveProvider, useLive, useLiveDropped } from "@/lib/live";
import { planetBlight, planetHealth, setOrbit } from "@/lib/orbit";
import type { ActivityReport, ServerSummary } from "@/lib/types";

type ServersContext = { servers: ServerSummary[] | undefined; error: ReturnType<typeof useApi>["error"]; reload: () => void };

/** The fleet list AppLayout keeps live; pages read it instead of fetching their own copy. */
export const useServers = () => useOutletContext<ServersContext>();

export function AppLayout() {
  return (
    <LiveProvider>
      <Shell />
    </LiveProvider>
  );
}

function Shell() {
  const navigate = useNavigate();
  const { data, error, reload, mutate } = useApi<ServerSummary[]>("/api/servers");
  // Open recommendations ravage the planet; applying or dismissing one heals it.
  const activity = useApi<ActivityReport>("/api/reports/activity");
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
      <main id="main" tabIndex={-1}>
        <Outlet context={{ servers: data, error, reload } satisfies ServersContext} />
      </main>
    </>
  );
}

function LiveNotice() {
  const dropped = useLiveDropped();
  return (
    <div role="status">
      {dropped && <p className="live-notice">연결이 끊겨 다시 연결하는 중입니다. 값이 최신이 아닐 수 있습니다.</p>}
    </div>
  );
}
