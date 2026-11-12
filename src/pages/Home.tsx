import { Link } from "react-router";
import { useServers } from "@/AppLayout";
import { Power } from "@/components/Power";
import { LiveLog } from "@/components/LiveLog";
import { Failure } from "@/components/Status";
import { useApi } from "@/lib/api";
import { formatKrw, isServerEstimated } from "@/lib/format";
import { useLive } from "@/lib/live";
import type { ActivityReport } from "@/lib/types";
import "@/styles/home.css";

/**
 * Home is the planet with one line under it: the fleet's draw now, this month's bill and the
 * commands waiting for the owner's approval; live events scroll past faintly at the side.
 */
export default function Home() {
  const { servers, error, reload } = useServers();
  const activity = useApi<ActivityReport>("/api/reports/activity");

  useLive((event) => {
    if (
      event.type === "reconnected" ||
      event.type === "consultation" ||
      event.type === "tool_call"
    )
      activity.reload();
  });

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
  const pending =
    activity.data?.calls.filter((c) => c.decision === "pending") ?? [];
  return (
    <>
      <LiveLog servers={servers} />
      <dl className="home-info">
        <div>
          <dt>지금 전체</dt>
          {/* Nothing online means no reading, not a measured zero. */}
          <dd>
            {reading.length > 0 ? (
              <Power
                value={watts}
                estimated={reading.some(isServerEstimated)}
              />
            ) : (
              <span className="muted">측정값 없음</span>
            )}
          </dd>
        </div>
        <div>
          <dt>이번 달 예상</dt>
          <dd>{formatKrw(krw)}</dd>
        </div>
        {activity.data && (
          <div>
            <dt>승인 대기</dt>
            <dd>
              {/* Waiting commands lead to the oldest one; nothing waiting is just a count. */}
              {pending.length > 0 ? (
                <Link
                  to={`/consultations/${pending.at(-1)!.consultationId}`}
                  className="home-pending"
                >
                  {pending.length}건
                </Link>
              ) : (
                "0건"
              )}
            </dd>
          </div>
        )}
      </dl>
    </>
  );
}
