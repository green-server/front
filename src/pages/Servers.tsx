import { Link } from "react-router";
import { useServers } from "@/AppLayout";
import { Panel } from "@/components/Panel";
import { Power } from "@/components/Power";
import { Failure, Loading, OnlineState } from "@/components/Status";
import { formatKrw, isServerEstimated, KIND_LABEL } from "@/lib/format";
import "@/styles/server.css";

export default function Servers() {
  const { servers, error, reload } = useServers();

  return (
    <Panel title="서버">
      <title>서버 · Green Server</title>
      <div className="list-actions">
        <Link to="/servers/new" className="btn btn-go">
          서버 추가
        </Link>
      </div>
      {error && <Failure error={error} retry={reload} />}
      {!error && !servers && <Loading />}
      {servers?.length === 0 && <p className="muted">등록한 서버가 없습니다.</p>}
      {servers && servers.length > 0 && (
        <ul className="rows">
          {servers.map((server) => (
            <li key={server.id}>
              <Link to={`/servers/${server.id}`} className="row server-row">
                <span className="row-main">
                  <strong>{server.name}</strong>
                  <span className="muted">
                    {KIND_LABEL[server.kind]} · <OnlineState online={server.online} />
                  </span>
                </span>
                {server.online ? <Power value={server.latestWatts} estimated={isServerEstimated(server)} /> : <span className="muted">꺼짐</span>}
                <span className="row-krw">{formatKrw(server.monthlyKrw)}/월</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
