import { Link } from "react-router";
import { useServers } from "@/AppLayout";
import { Power } from "@/components/Power";
import { ServerList } from "@/components/ServerList";
import { PlanetView } from "@/components/PlanetView";
import { SatelliteLabels } from "@/components/SatelliteLabels";
import { Failure, Loading } from "@/components/Status";
import { useApi } from "@/lib/api";
import { formatKrw, isServerEstimated } from "@/lib/format";
import { useLive } from "@/lib/live";
import { weekChangePct } from "@/lib/orbit";
import type { ActivityReport } from "@/lib/types";
import "@/styles/home.css";

const MAX_ROWS = 3;

export default function Home() {
  const { servers, error, reload } = useServers();
  const activity = useApi<ActivityReport>("/api/reports/activity");

  useLive((event) => {
    if (event.type === "reconnected" || event.type === "consultation" || event.type === "tool_call") activity.reload();
  });

  const change = weekChangePct(servers);
  const reading = servers?.filter((s) => s.online && s.latestWatts !== null) ?? [];
  const watts = reading.reduce((sum, s) => sum + s.latestWatts!, 0);
  const krw = servers?.reduce((sum, s) => sum + s.monthlyKrw, 0);
  const rows: { key: string; to: string; title: string; detail: string; pending: boolean }[] = [];
  for (const call of activity.data?.calls ?? []) {
    if (call.decision === "pending") {
      rows.push({ key: `c${call.id}`, to: `/consultations/${call.consultationId}`, title: `${call.serverName} · 명령 승인 대기`, detail: call.command, pending: true });
    }
  }
  for (const row of activity.data?.servers ?? []) {
    if (row.open > 0) {
      rows.push({ key: `s${row.serverId}`, to: `/servers/${row.serverId}`, title: `${row.serverName} · 추천 ${row.open}건`, detail: row.openSavingKrw > 0 ? `월 ${formatKrw(row.openSavingKrw)} 절약 예상` : "추천 내용을 확인하세요", pending: false });
    }
  }

  return (
    <div className="home">
      <title>서버 현황 · Green Server</title>
      <header className="page-heading">
        <div><h1>서버 현황</h1><p className="muted">전력 사용부터 비용 절약까지, 한곳에서 확인하세요.</p></div>
        <Link to="/servers/new" className="btn btn-go">서버 연결하기</Link>
      </header>
      {error && <Failure error={error} retry={reload} />}
      <section className="fleet-overview" aria-label="전체 사용량">
        <div className="fleet-readings">
          <h2>지금 전체 전력</h2>
          <div className="fleet-power">
            {reading.length > 0 ? <Power value={watts} estimated={reading.some(isServerEstimated)} size="xl" /> : <span className="figure-lg muted">—<span className="sr-only"> 전력 수신 대기</span></span>}
          </div>
          <p className="home-change">
            {change === null ? "7일 비교 데이터가 아직 없습니다." : change === 0 ? "7일 평균과 같은 사용량" : <>7일 평균보다 <strong className={change < 0 ? "is-less" : "is-more"}>{Math.abs(change)}% {change < 0 ? "감소" : "증가"}</strong></>}
          </p>
          <dl className="home-figures">
            <div><dt>이번 달 예상 요금</dt><dd>{krw === undefined ? "—" : formatKrw(krw)}</dd></div>
            <div><dt>연결된 서버</dt><dd>{servers ? <>{servers.filter((s) => s.online).length}<small> / {servers.length}대</small></> : "—"}</dd></div>
          </dl>
        </div>
        <PlanetView><SatelliteLabels /></PlanetView>
      </section>
      <div className="home-workspace">
        <section className="fleet-list" aria-labelledby="fleet-heading">
          <div className="section-head"><h2 id="fleet-heading">내 서버 <span className="muted">{servers?.length}</span></h2><Link to="/servers" className="text-link">전체 보기</Link></div>
          {!error && !servers && <Loading />}
          {servers?.length === 0 && <div className="empty-state"><h3>첫 서버를 연결해 보세요</h3><p className="muted">서버의 전력 사용량과 예상 요금을 확인할 수 있습니다.</p><Link to="/servers/new" className="btn">서버 연결하기</Link></div>}
          {servers && servers.length > 0 && <ServerList servers={servers} />}
        </section>
        <section className="home-actions" aria-labelledby="actions-heading">
          <div className="section-head"><h2 id="actions-heading">확인할 작업</h2>{activity.data && <span className="action-count">{rows.length}</span>}</div>
          {activity.error && <Failure error={activity.error} retry={activity.reload} />}
          {!activity.error && !activity.data && <Loading />}
          {activity.data && rows.length === 0 && <p className="muted empty-state">대기 중인 승인이나 추천이 없습니다.</p>}
          <div className="home-notice">
            {rows.slice(0, MAX_ROWS).map((r) => (
              <Link key={r.key} to={r.to} className={r.pending ? "notice-row is-pending" : "notice-row"}>
                <span>{r.title}</span>
                {r.pending ? <code>{r.detail}</code> : <span className="notice-detail">{r.detail}</span>}
                <span className="notice-go">{r.pending ? "승인 검토하기" : "추천 확인하기"}</span>
              </Link>
            ))}
          </div>
          {rows.length > MAX_ROWS && <Link to="/reports" className="text-link">나머지 {rows.length - MAX_ROWS}건 보기</Link>}
        </section>
      </div>
    </div>
  );
}
