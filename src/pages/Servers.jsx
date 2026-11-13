import { Link } from "react-router-dom";
import styled from "styled-components";
import { useServers } from "@/AppLayout";
import { Panel } from "@/components/Panel";
import { Power } from "@/components/Power";
import { Failure, Loading, OnlineState } from "@/components/Status";
import { formatKrw, isServerEstimated, KIND_LABEL } from "@/lib/format";
import { RowKrw, RowMain, ServerRow } from "@/styles";

export default function Servers() {
  const { servers, error, reload } = useServers();

  return (
    <Panel title="서버">
      <title>서버 · Green Server</title>
      <ListActions>
        <Link to="/servers/new" className="btn btn-go">
          서버 추가
        </Link>
      </ListActions>
      {error && <Failure error={error} retry={reload} />}
      {!error && !servers && <Loading />}
      {servers?.length === 0 && <p className="muted">등록한 서버가 없습니다.</p>}
      {servers && servers.length > 0 && (
        <ul className="rows">
          {servers.map((server) => (
            <li key={server.id}>
              <ServerRow to={`/servers/${server.id}`}>
                <RowMain>
                  <strong>{server.name}</strong>
                  <span className="muted">
                    {KIND_LABEL[server.kind]} · <OnlineState online={server.online} />
                  </span>
                </RowMain>
                {server.online ? <Power value={server.latestWatts} estimated={isServerEstimated(server)} /> : <span className="muted">꺼짐</span>}
                <RowKrw>{formatKrw(server.monthlyKrw)}/월</RowKrw>
              </ServerRow>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const ListActions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.5lh;
`;
