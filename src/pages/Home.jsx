import { Link } from "react-router-dom";
import styled from "styled-components";
import { useServers } from "@/AppLayout";
import { Power } from "@/components/Power";
import { Failure } from "@/components/Status";
import { useApi } from "@/lib/api";
import { formatKrw, isServerEstimated } from "@/lib/format";
import { useLive } from "@/lib/live";

/**
 * Home is the planet with one line under it: the fleet's draw now, this month's bill and the
 * commands waiting for the owner's approval.
 */
export default function Home() {
  const { servers, error, reload } = useServers();
  const activity = useApi("/api/reports/activity");

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
      <Empty>
        <Failure error={error} retry={reload} />
      </Empty>
    );
  }
  if (servers?.length === 0) {
    return (
      <Empty>
        <Link to="/servers/new" className="btn btn-go">
          서버 연결하기
        </Link>
      </Empty>
    );
  }
  if (!servers) return null;

  const reading = servers.filter((s) => s.online && s.latestWatts !== null);
  const watts = reading.reduce((sum, s) => sum + s.latestWatts, 0);
  const krw = servers.reduce((sum, s) => sum + s.monthlyKrw, 0);
  const pending =
    activity.data?.calls.filter((c) => c.decision === "pending") ?? [];
  return (
    <Info>
      <div>
        <dt>지금 전체</dt>
        {/* Nothing online means no reading, not a measured zero. */}
        <dd>
          {reading.length > 0 ? (
            <Power value={watts} estimated={reading.some(isServerEstimated)} />
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
              <Pending to={`/consultations/${pending.at(-1).consultationId}`}>
                {pending.length}건
              </Pending>
            ) : (
              "0건"
            )}
          </dd>
        </div>
      )}
    </Info>
  );
}

/* Home is the planet alone; this centres the one thing that can sit over it. */
const Empty = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  pointer-events: none;

  & > * {
    pointer-events: auto;
  }
`;

/* One line under the planet: label, value; label, value. */
const Info = styled.dl`
  position: fixed;
  bottom: calc(1lh + env(safe-area-inset-bottom));
  left: 50%;
  z-index: 2;
  display: flex;
  gap: 4ch;
  margin: 0;
  translate: -50% 0;
  white-space: nowrap;

  & > div {
    display: flex;
    gap: 1ch;
  }
  & dt {
    color: var(--ink-2);
  }
  & dd {
    margin: 0;
    font-weight: 700;
  }

  @media (max-width: 759.98px) {
    bottom: calc(var(--tabs-h) + 1lh);
    flex-direction: column;
    gap: 0;
    align-items: center;
  }
`;

const Pending = styled(Link)`
  color: var(--warn);

  &:hover,
  &:focus-visible {
    background: var(--warn);
    color: var(--paper);
    outline: 0;
  }
`;
