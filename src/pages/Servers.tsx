import { Link } from "react-router";
import { useServers } from "@/AppLayout";
import { Panel } from "@/components/Panel";
import { ServerList } from "@/components/ServerList";
import { Failure, Loading } from "@/components/Status";
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
        <ServerList servers={servers} />
      )}
    </Panel>
  );
}
