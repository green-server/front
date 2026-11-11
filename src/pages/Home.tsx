import { Link } from "react-router";
import { useServers } from "@/AppLayout";
import { Power } from "@/components/Power";
import { Failure } from "@/components/Status";
import { useApi } from "@/lib/api";
import { formatKrw, isServerEstimated } from "@/lib/format";
import { useLive } from "@/lib/live";
import { weekChangePct } from "@/lib/scene";
import type { ActivityReport } from "@/lib/types";
import "@/styles/home.css";

const MAX_ROWS = 3;

export default function Home() {
  const { servers, error, reload } = useServers();
  const activity = useApi<ActivityReport>("/api/reports/activity");

  useLive((event) => {
    if (event.type === "reconnected" || event.type === "consultation" || event.type === "tool_call") activity.reload();
  });

  if (servers?.length === 0) {
    return (
      <div className="home-empty">
        <Link to="/servers/new" className="btn btn-go">
          서버 연결하기
        </Link>
      </div>
    );
  }

  const change = weekChangePct(servers);
  const reading = servers?.filter((s) => s.online && s.latestWatts !== null) ?? [];
  const watts = reading.reduce((sum, s) => sum + s.latestWatts!, 0);
  const krw = servers?.reduce((sum, s) => sum + s.monthlyKrw, 0) ?? 0;

  const rows: { key: string; to: string; title: string; detail: string; pending: boolean }[] = [];
  for (const call of activity.data?.calls ?? []) {
    if (call.decision === "pending") {
      rows.push({ key: `c${call.id}`, to: `/consultations/${call.consultationId}`, title: `${call.serverName} · 명령 승인 대기`, detail: call.command, pending: true });
    }
  }
  for (const row of activity.data?.servers ?? []) {
    if (row.open > 0) {
      const saving = row.openSavingKrw > 0 ? ` · 월 ${formatKrw(row.openSavingKrw)} 절약 예상` : "";
      rows.push({ key: `s${row.serverId}`, to: `/servers/${row.serverId}`, title: `${row.serverName} · 추천 ${row.open}건${saving}`, detail: "", pending: false });
    }
  }

  return (
    <div className="home">
      {change === 0 && <p className="home-line">7일 평균과 같음</p>}
      {change !== null && change !== 0 && (
        <p className="home-line">
          7일 평균보다 <b className={change < 0 ? "is-less" : "is-more"}>{Math.abs(change)}%</b> {change < 0 ? "적게" : "많이"}
        </p>
      )}

      {(error || rows.length > 0) && (
        <div className="home-notice">
          {error && <Failure error={error} retry={reload} />}
          {rows.slice(0, MAX_ROWS).map((r) => (
            <Link key={r.key} to={r.to} className={r.pending ? "notice-row is-pending" : "notice-row"}>
              <span>{r.title}</span>
              {r.detail && <code>{r.detail}</code>}
              {r.pending && <span className="notice-go">승인하러 가기</span>}
            </Link>
          ))}
          {rows.length > MAX_ROWS && <p className="muted">외 {rows.length - MAX_ROWS}건</p>}
        </div>
      )}

      {servers && (
        <dl className="home-figures">
          <div>
            <dt>지금 전체 전력</dt>
            {/* Amber once the fleet draws more than its 7-day average, like the line above. */}
            <dd className={change !== null && change > 0 ? "is-more" : undefined}>
              {/* Nothing online means no reading, not a measured zero. */}
              {reading.length > 0 ? (
                <Power value={watts} estimated={reading.some(isServerEstimated)} size="xl" />
              ) : (
                <span className="figure-lg muted">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt>이번 달 예상 요금</dt>
            <dd className="home-krw">{formatKrw(krw)}</dd>
          </div>
        </dl>
      )}

      {servers && (
        <ul className="home-list rows">
          {servers.map((s) => (
            <li key={s.id}>
              <Link to={`/servers/${s.id}`}>
                <span>{s.name}</span>
                {s.online ? <Power value={s.latestWatts} estimated={isServerEstimated(s)} /> : <span className="muted">꺼짐</span>}
                <span>{formatKrw(s.monthlyKrw)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
