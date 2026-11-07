"use client";

import Link from "next/link";
import { Power } from "@/components/Power";
import { Failure, Loading, OnlineState } from "@/components/Status";
import { Trace } from "@/components/Trace";
import { useApi } from "@/lib/api";
import { appendMetric, formatKrw, isServerEstimated, KIND_LABEL } from "@/lib/format";
import { useLive } from "@/lib/live";
import type { ActivityReport, Metric, ServerSummary } from "@/lib/types";

const HOUR_MS = 3_600_000;

export default function ServersPage() {
  const { data: servers, error, reload, mutate } = useApi<ServerSummary[]>("/api/servers");
  // The rows work without it: a failed count must not take the board down.
  const activity = useApi<ActivityReport>("/api/reports/activity");

  useLive((event) => {
    if (event.type === "reconnected") reload();
    // A consultation is what files or applies recommendations.
    if (event.type === "reconnected" || event.type === "consultation") activity.reload();
    if (event.type === "metric") {
      const { watts, isEstimated } = event.metric;
      mutate((list) => list.map((s) => (s.id === event.serverId ? { ...s, latestWatts: watts, isEstimated } : s)));
    }
    if (event.type === "agent_status") {
      mutate((list) => list.map((s) => (s.id === event.serverId ? { ...s, online: event.online } : s)));
    }
  });

  return (
    <>
      <title>서버 · Green Server</title>
      <div className="page-head">
        <h1>서버</h1>
        {servers && servers.length > 0 && (
          <Link href="/servers/new" className="button">
            서버 추가
          </Link>
        )}
      </div>

      {error && <Failure error={error} retry={reload} />}
      {!error && !servers && <Loading />}

      {servers?.length === 0 && (
        <div className="empty">
          <p>아직 추가한 서버가 없습니다. 서버를 추가하고 에이전트를 설치하면 전력과 요금이 여기에 나타납니다.</p>
          <ol className="setup-steps">
            <li>서버를 등록합니다.</li>
            <li>설치 명령어를 서버 터미널에서 실행합니다.</li>
            <li>첫 측정값이 들어오면 이 화면에 파형이 그려집니다.</li>
          </ol>
          <Link href="/servers/new" className="button button-primary">
            서버 추가
          </Link>
        </div>
      )}

      {servers && servers.length > 1 && <FleetSummary servers={servers} waiting={activity.data} />}

      {servers && servers.length > 0 && (
        <ul className={servers.length > 3 ? "meter-board is-fleet" : "meter-board"}>
          {servers.map((server) => (
            <li key={server.id}>
              <ServerRow server={server} activity={activity.data?.servers.find((row) => row.serverId === server.id)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function FleetSummary({ servers, waiting }: { servers: ServerSummary[]; waiting?: ActivityReport }) {
  const reading = servers.filter((server) => server.latestWatts !== null);
  const watts = reading.reduce((sum, server) => sum + server.latestWatts!, 0);
  const krw = servers.reduce((sum, server) => sum + server.monthlyKrw, 0);
  const online = servers.filter((server) => server.online).length;
  const open = waiting?.servers.reduce((sum, row) => sum + row.open, 0);

  return (
    <dl className="fleet">
      <div>
        <dt>지금 전체 전력</dt>
        <dd>
          <Power value={watts} estimated={reading.some(isServerEstimated)} />
        </dd>
      </div>
      <div>
        <dt>이번 달 예상 요금</dt>
        <dd className="figure">{formatKrw(krw)}</dd>
      </div>
      <div>
        <dt>연결됨</dt>
        <dd className="figure">
          {online} / {servers.length}대
        </dd>
      </div>
      {open !== undefined && (
        <div>
          <dt>대기 중인 추천</dt>
          <dd className="figure">{open}건</dd>
        </div>
      )}
    </dl>
  );
}

function ServerRow({ server, activity }: { server: ServerSummary; activity?: ActivityReport["servers"][number] }) {
  const { data: metrics, reload, mutate } = useApi<Metric[]>(`/api/servers/${server.id}/metrics?range=1h`);

  useLive((event) => {
    if (event.type === "reconnected") reload();
    if (event.type === "metric" && event.serverId === server.id) mutate((list) => appendMetric(list, event.metric, HOUR_MS));
  });

  return (
    <Link href={`/servers/${server.id}`} className={server.online ? "meter-row" : "meter-row meter-row-off"}>
      <span className="meter-name">
        <strong>{server.name}</strong>
        {server.name !== KIND_LABEL[server.kind] && <span className="caption">{KIND_LABEL[server.kind]}</span>}
        <OnlineState online={server.online} />
      </span>
      <span className="meter-reading">
        <Power value={server.latestWatts} estimated={isServerEstimated(server)} size="md" />
      </span>
      <span className="meter-cost">
        <span className="caption">이번 달 예상 요금</span>
        <span className="figure">{formatKrw(server.monthlyKrw)}</span>
        {activity !== undefined && activity.open > 0 && (
          <span className="meter-recs">
            추천 {activity.open}건{activity.openSavingKrw > 0 && ` · 예상 ${formatKrw(activity.openSavingKrw)}`}
          </span>
        )}
      </span>
      {metrics && metrics.length > 1 && <span className="caption meter-range">최근 1시간</span>}
      <Trace metrics={metrics ?? []} />
    </Link>
  );
}
