import { Link } from "react-router-dom";
import { useState } from "react";
import styled from "styled-components";
import { Panel } from "@/components/Panel";
import { Power } from "@/components/Power";
import { Failure, Loading } from "@/components/Status";
import { useApi } from "@/lib/api";
import {
  callHasProblem,
  formatDateTime,
  formatKrw,
  groupCalls,
  outcome,
  recommendationTypeLabel,
  reportItemEstimated,
  SOURCE_LABEL,
} from "@/lib/format";
import { useLive } from "@/lib/live";

export default function ReportsPage() {
  const report = useApi("/api/reports/savings");
  const servers = useApi("/api/servers");
  const activity = useApi("/api/reports/activity");

  useLive((event) => {
    if (event.type === "reconnected") {
      report.reload();
      servers.reload();
      activity.reload();
    }
  });

  const error = report.error ?? servers.error ?? activity.error;
  const retry = () => {
    report.reload();
    servers.reload();
    activity.reload();
  };

  return (
    <Panel title="절약 리포트">
      <title>절약 리포트 · Green Server</title>
      {error && <Failure error={error} retry={retry} />}
      {!error && (!report.data || !servers.data || !activity.data) && (
        <Loading />
      )}
      {report.data && servers.data && activity.data && (
        <>
          <Report report={report.data} servers={servers.data} />
          <ServerActivity activity={activity.data} />
          <RecentCalls activity={activity.data} />
        </>
      )}
    </Panel>
  );
}

function Report({
  report,
  servers,
}) {
  const { total } = report;
  if (report.items.length === 0 && total.savedKrwMonth === 0) {
    return (
      <p className="section">
        아직 적용한 조치가 없습니다.{" "}
        <Link to="/servers">서버에서 추천 보기</Link>
      </p>
    );
  }

  return (
    <>
      <Total>
        <span className="figure-lg">
          이번 달 절약 {formatKrw(total.savedKrwMonth)}
        </span>
        <Co2>{total.savedCo2KgMonth} kg CO₂</Co2>
      </Total>
      <section className="section" aria-labelledby="actions-heading">
        <h2 id="actions-heading">조치별 절약</h2>
        <ul className="rows">
          {report.items
            .toSorted((a, b) => b.savedKrwMonth - a.savedKrwMonth)
            .map((item) => {
              const estimated = reportItemEstimated(item, servers);
              return (
                <ReportRow key={item.recommendationId}>
                  <span>
                    <strong>{item.serverName}</strong>{" "}
                    {recommendationTypeLabel(item.type)}{" "}
                    <span className="tag">{SOURCE_LABEL[item.source]}</span>
                  </span>
                  <Change>
                    <Power value={item.beforeWatts} estimated={estimated} />
                    <span aria-hidden="true">→</span>
                    <Power value={item.afterWatts} estimated={estimated} />
                  </Change>
                  <Money>
                    {formatKrw(item.savedKrwMonth)}/월
                  </Money>
                </ReportRow>
              );
            })}
        </ul>
      </section>
    </>
  );
}

function ServerActivity({ activity }) {
  const rows = activity.servers.toSorted(
    (a, b) => b.openSavingKrw - a.openSavingKrw || b.total - a.total,
  );
  return (
    <section className="section" aria-labelledby="activity-heading">
      <h2 id="activity-heading">서버별 추천 현황</h2>
      {rows.length === 0 ? (
        <p className="muted">아직 추가한 서버가 없습니다.</p>
      ) : (
        <ul className="rows">
          {rows.map((row) => (
            <ReportRow key={row.serverId}>
              <Link to={`/servers/${row.serverId}`}>
                <strong>{row.serverName}</strong>
              </Link>
              <span className="muted">
                적용 {row.applied}건 · 대기 {row.open}건 · 무시{" "}
                {row.total - row.open - row.applied}건
              </span>
              <Money>
                {formatKrw(row.openSavingKrw)}/월
              </Money>
            </ReportRow>
          ))}
        </ul>
      )}
    </section>
  );
}

const CALL_FILTERS = [
  { value: "all", label: "전체" },
  { value: "actions", label: "조치만" },
  { value: "problems", label: "문제만" },
];

function RecentCalls({ activity }) {
  const [filter, setFilter] = useState("all");
  const shown = activity.calls.filter(
    (call) =>
      filter === "all" ||
      (filter === "actions" ? call.tier === "approve" : callHasProblem(call)),
  );
  const groups = groupCalls(shown);

  return (
    <section className="section" aria-labelledby="calls-heading">
      <h2 id="calls-heading">최근 실행 명령</h2>
      <Filter role="group" aria-label="명령 필터">
        {CALL_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={option.value === filter ? "btn" : "btn btn-quiet"}
            aria-pressed={option.value === filter}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </Filter>
      {activity.calls.length === 0 && (
        <p className="muted">아직 실행한 명령이 없습니다.</p>
      )}
      {activity.calls.length > 0 && groups.length === 0 && (
        <p className="muted">해당하는 명령이 없습니다.</p>
      )}
      {groups.map((calls, index) => {
        const problems = calls.filter(callHasProblem).length;
        return (
          // Keyed by filter too: switching filters resets which group starts open.
          <CallGroup
            key={`${filter}-${calls[0].consultationId}`}
            open={index === 0}
          >
            <summary>
              <strong>{calls[0].serverName}</strong>{" "}
              <span className="muted">
                {formatDateTime(calls[0].requestedAt)}
              </span>
              <span className="muted">
                {" "}
                · 명령 {calls.length}개{problems > 0 && ` · 문제 ${problems}개`}
              </span>
            </summary>
            <CallList>
              {calls.map((call) => (
                <li
                  key={call.id}
                  className={callHasProblem(call) ? "call-problem" : undefined}
                >
                  <code translate="no">{call.command}</code>
                  <span className="muted">{outcome(call)}</span>
                </li>
              ))}
            </CallList>
            <Link to={`/consultations/${calls[0].consultationId}`}>
              컨설팅 보기
            </Link>
          </CallGroup>
        );
      })}
    </section>
  );
}

const Total = styled.p`
  display: grid;
  margin: 0;
`;

const Co2 = styled.span`
  color: var(--ink-2);
`;

const ReportRow = styled.li`
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: baseline;
  gap: 0 2ch;

  @media (max-width: 759.98px) {
    grid-template-columns: 1fr auto;
  }
`;

const Change = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 1ch;

  @media (max-width: 759.98px) {
    grid-column: 1 / -1;
    grid-row: 2;
  }
`;

const Money = styled.span`
  min-width: 12ch;
  font-weight: 700;
  text-align: right;

  @media (max-width: 759.98px) {
    grid-column: -2;
  }
`;

const Filter = styled.div`
  display: flex;
  gap: 1ch;

  & [aria-pressed="true"] {
    background: var(--go);
    color: var(--on-go);
  }
  /* Hover and focus still reverse it the way .btn does: that rule used to win the tie by coming
     later in the stylesheet. */
  & [aria-pressed="true"]:hover,
  & [aria-pressed="true"]:focus-visible {
    background: var(--ink);
    color: var(--paper);
  }
`;

const CallGroup = styled.details`
  padding: 0.5lh 0;
  border-top: 1px dashed var(--line);

  & summary {
    list-style: none;
    cursor: pointer;
  }
  & summary::-webkit-details-marker {
    display: none;
  }
  & summary::before {
    content: "▸ ";
    color: var(--ink-2);
  }
  &[open] summary::before {
    content: "▾ ";
  }
`;

const CallList = styled.ol`
  display: grid;
  margin: 0.5lh 0;
  padding: 0;
  list-style: none;

  & li {
    display: grid;
  }
  & code {
    overflow-wrap: anywhere;
  }
  & code::before {
    content: "$ ";
    color: var(--ink-2);
  }
  & .call-problem code {
    color: var(--bad);
  }
`;
