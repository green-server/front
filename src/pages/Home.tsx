import { Link } from "react-router";
import { useServers } from "@/AppLayout";
import { Power } from "@/components/Power";
import { Failure } from "@/components/Status";
import { formatKrw, isServerEstimated } from "@/lib/format";
import "@/styles/home.css";

/** Home is the planet with one line under it: the fleet's draw now and this month's bill. */
export default function Home() {
  const { servers, error, reload } = useServers();

  if (error) {
    return (
      <div className="home-empty">
        <Failure error={error} retry={reload} />
      </div>
    );
  }
  if (servers?.length === 0) {
    return (
      <div className="home-empty">
        <Link to="/servers/new" className="btn btn-go">
          서버 연결하기
        </Link>
      </div>
    );
  }
  if (!servers) return null;

  const reading = servers.filter((s) => s.online && s.latestWatts !== null);
  const watts = reading.reduce((sum, s) => sum + s.latestWatts!, 0);
  const krw = servers.reduce((sum, s) => sum + s.monthlyKrw, 0);
  return (
    <dl className="home-info">
      <div>
        <dt>지금 전체</dt>
        {/* Nothing online means no reading, not a measured zero. */}
        <dd>{reading.length > 0 ? <Power value={watts} estimated={reading.some(isServerEstimated)} /> : <span className="muted">측정값 없음</span>}</dd>
      </div>
      <div>
        <dt>이번 달 예상</dt>
        <dd>{formatKrw(krw)}</dd>
      </div>
    </dl>
  );
}
