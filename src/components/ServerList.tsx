import { Link } from "react-router";
import { Power } from "@/components/Power";
import { OnlineState } from "@/components/Status";
import { formatKrw, isServerEstimated, KIND_LABEL } from "@/lib/format";
import type { ServerSummary } from "@/lib/types";
import "@/styles/server.css";

export function ServerList({ servers }: { servers: ServerSummary[] }) {
  return (
    <ul className="rows server-list">
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
  );
}
