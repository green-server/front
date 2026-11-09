import { Link } from "react-router";
import { useState } from "react";
import { Panel } from "@/components/Panel";
import { Power } from "@/components/Power";
import "@/styles/reports.css";
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
import type { ActivityReport, SavingsReport, ServerSummary } from "@/lib/types";

export default function ReportsPage() {
  const report = useApi<SavingsReport>("/api/reports/savings");
  const servers = useApi<ServerSummary[]>("/api/servers");
  const activity = useApi<ActivityReport>("/api/reports/activity");

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
}: {
  report: SavingsReport;
  servers: ServerSummary[];
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
      <p className="report-total">
        <span className="figure-lg">
          이번 달 절약 {formatKrw(total.savedKrwMonth)}
        </span>
        <span className="report-co2">{total.savedCo2KgMonth} kg CO₂</span>
      </p>
      <section className="section" aria-labelledby="actions-heading">
        <h2 id="actions-heading">조치별 절약</h2>
        <ul className="rows">
          {report.items
            .toSorted((a, b) => b.savedKrwMonth - a.savedKrwMonth)
            .map((item) => {
              const estimated = reportItemEstimated(item, servers);
              return (
                <li key={item.recommendationId} className="report-row">
                  <span>
                    <strong>{item.serverName}</strong>{" "}
                    {recommendationTypeLabel(item.type)}{" "}
                    <span className="tag">{SOURCE_LABEL[item.source]}</span>
                  </span>
                  <span className="report-change">
                    <Power value={item.beforeWatts} estimated={estimated} />
                    <span aria-hidden="true">→</span>
                    <Power value={item.afterWatts} estimated={estimated} />
                  </span>
                  <span className="report-money">
                    {formatKrw(item.savedKrwMonth)}/월
                  </span>
                </li>
              );
            })}
        </ul>
      </section>
    </>
  );
}

function ServerActivity({ activity }: { activity: ActivityReport }) {
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
            <li key={row.serverId} className="report-row">
              <Link to={`/servers/${row.serverId}`}>
                <strong>{row.serverName}</strong>
              </Link>
              <span className="muted">
                적용 {row.applied}건 · 대기 {row.open}건 · 무시{" "}
                {row.total - row.open - row.applied}건
              </span>
              <span className="report-money">
                {formatKrw(row.openSavingKrw)}/월
              </span>
            </li>
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
] as const;

function RecentCalls({ activity }: { activity: ActivityReport }) {
  const [filter, setFilter] =
    useState<(typeof CALL_FILTERS)[number]["value"]>("all");
  const shown = activity.calls.filter(
    (call) =>
      filter === "all" ||
      (filter === "actions" ? call.tier === "approve" : callHasProblem(call)),
  );
  const groups = groupCalls(shown);

  return (
    <section className="section" aria-labelledby="calls-heading">
      <h2 id="calls-heading">최근 실행 명령</h2>
      <div className="report-filter" role="group" aria-label="명령 필터">
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
      </div>
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
          <details
            key={`${filter}-${calls[0].consultationId}`}
            className="call-group"
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
            <ol className="call-list">
              {calls.map((call) => (
                <li
                  key={call.id}
                  className={callHasProblem(call) ? "call-problem" : undefined}
                >
                  <code translate="no">{call.command}</code>
                  <span className="muted">{outcome(call)}</span>
                </li>
              ))}
            </ol>
            <Link to={`/consultations/${calls[0].consultationId}`}>
              컨설팅 보기
            </Link>
          </details>
        );
      })}
    </section>
  );
}
