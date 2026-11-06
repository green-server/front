"use client";

import Link from "next/link";
import { useState } from "react";
import { Krw, Power } from "@/components/Power";
import { Failure, Loading } from "@/components/Status";
import { useApi } from "@/lib/api";
import {
  callHasProblem,
  formatDateTime,
  formatKrw,
  groupCalls,
  outcome,
  powerChange,
  recommendationTypeLabel,
  reportItemEstimated,
  SOURCE_LABEL,
} from "@/lib/format";
import { useLive } from "@/lib/live";
import type { ActivityReport, SavingsReport, ServerSummary } from "@/lib/types";

const SOURCES = ["rule", "ai"] as const;

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
    <>
      <title>절약 리포트 · Green Server</title>
      <div className="page-head">
        <h1>절약 리포트</h1>
      </div>
      {error && <Failure error={error} retry={retry} />}
      {!error && (!report.data || !servers.data || !activity.data) && <Loading />}
      {report.data && servers.data && activity.data && (
        <div className="console">
          <Report report={report.data} servers={servers.data} />
          <ServerActivity activity={activity.data} />
          <RecentCalls activity={activity.data} />
        </div>
      )}
    </>
  );
}

function Report({ report, servers }: { report: SavingsReport; servers: ServerSummary[] }) {
  const max = Math.max(...report.bySource.map((row) => row.savedKrwMonth), 1);
  const total = report.bySource.reduce((sum, row) => sum + row.savedKrwMonth, 0);

  if (report.items.length === 0 && total === 0) {
    const proposed = report.bySource.reduce((sum, row) => sum + row.total, 0);
    return (
      <div className="empty">
        <p>
          {proposed > 0
            ? `추천 ${proposed}건이 기다리고 있습니다. 조치를 적용하고 재측정이 끝나면 줄어든 전력과 금액이 여기에 나타납니다.`
            : "아직 적용한 조치가 없습니다. 조치를 적용하고 재측정이 끝나면 절약 금액이 여기에 나타납니다."}
        </p>
        <Link href="/" className="button button-primary">
          서버에서 추천 보기
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="report-total">
        <Krw value={total} />
        <span className="caption">월 절약 합계</span>
      </p>
      <section aria-labelledby="compare-heading" className="pane">
        <div className="pane-head">
          <h2 id="compare-heading">규칙 추천과 AI 추천 비교</h2>
        </div>
        <dl className="compare">
          {SOURCES.map((source) => {
            const row = report.bySource.find((entry) => entry.source === source);
            return (
              <div key={source}>
                <dt>{SOURCE_LABEL[source]} 추천</dt>
                <dd>
                  <Krw value={row?.savedKrwMonth ?? 0} />
                  <span className="caption">월 절약</span>
                  <span className="gauge gauge-wide" aria-hidden="true">
                    <span style={{ width: `${((row?.savedKrwMonth ?? 0) / max) * 100}%` }} />
                  </span>
                  <span className="caption">
                    추천 {row?.total ?? 0}건 중 {row?.applied ?? 0}건 적용
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section aria-labelledby="actions-heading" className="pane">
        <div className="pane-head">
          <h2 id="actions-heading">조치별 절약</h2>
        </div>
        {report.items.length === 0 ? (
          <p className="status">아직 적용한 조치가 없습니다. 조치를 적용하고 재측정이 끝나면 절약 금액이 여기에 나타납니다.</p>
        ) : (
          <table className="data-table report-table">
            <thead>
              <tr>
                <th scope="col">조치</th>
                <th scope="col">적용 시각</th>
                <th scope="col">전력 변화</th>
                <th scope="col" className="numeric">절약 전력량</th>
                <th scope="col" className="numeric">월 절약</th>
              </tr>
            </thead>
            <tbody>
              {report.items.toSorted((a, b) => b.savedKrwMonth - a.savedKrwMonth).map((item) => {
                const estimated = reportItemEstimated(item, servers);
                const change = powerChange(item.beforeWatts, item.afterWatts);
                return (
                  <tr key={item.recommendationId}>
                    <td data-label="조치">
                      <span className="cell-stack">
                        <strong>{recommendationTypeLabel(item.type)}</strong>
                        <span className="caption">
                          {item.serverName} · {SOURCE_LABEL[item.source]} 추천
                        </span>
                      </span>
                    </td>
                    <td data-label="적용 시각" className="cell-time">{formatDateTime(item.appliedAt)}</td>
                    <td data-label="전력 변화">
                      <span className="power-change">
                        <Power value={item.beforeWatts} estimated={estimated} />
                        <span aria-hidden="true">→</span>
                        <Power value={item.afterWatts} estimated={estimated} />
                        {change !== null && <span className="power-delta">{change}%</span>}
                      </span>
                    </td>
                    <td data-label="절약 전력량" className="numeric">
                      <Power value={item.savedKwhMonth} estimated={estimated} unit="kWh/월" />
                    </td>
                    <td data-label="월 절약" className="numeric cell-money">{formatKrw(item.savedKrwMonth)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function ServerActivity({ activity }: { activity: ActivityReport }) {
  const rows = activity.servers.toSorted((a, b) => b.openSavingKrw - a.openSavingKrw || b.total - a.total);
  const waiting = rows.reduce((sum, row) => sum + row.openSavingKrw, 0);

  return (
    <section aria-labelledby="activity-heading" className="pane">
      <div className="pane-head">
        <h2 id="activity-heading">서버별 추천 현황</h2>
      </div>
      {rows.length === 0 ? (
        <p className="status">아직 추가한 서버가 없습니다.</p>
      ) : (
        <table className="data-table report-table activity-table">
          <thead>
            <tr>
              <th scope="col">서버</th>
              <th scope="col" className="col-progress">
                <span className="stack-legend">
                  <span>처리 현황</span>
                  <span className="key key-applied">적용</span>
                  <span className="key key-open">대기</span>
                  <span className="key key-dismissed">무시</span>
                </span>
              </th>
              <th scope="col" className="numeric">적용</th>
              <th scope="col" className="numeric">대기</th>
              <th scope="col" className="numeric">무시</th>
              <th scope="col" className="numeric">대기 중 예상 절약</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const dismissed = row.total - row.open - row.applied;
              return (
                <tr key={row.serverId}>
                  <td data-label="서버">
                    <Link href={`/servers/${row.serverId}`} className="cell-link">
                      {row.serverName}
                    </Link>
                  </td>
                  <td className="col-progress">
                    {row.total === 0 ? (
                      <span className="caption">추천 없음</span>
                    ) : (
                      <span className="stack" aria-hidden="true">
                        <span className="stack-applied" style={{ flexGrow: row.applied }} />
                        <span className="stack-open" style={{ flexGrow: row.open }} />
                        <span className="stack-dismissed" style={{ flexGrow: dismissed }} />
                      </span>
                    )}
                  </td>
                  <td data-label="적용" className="numeric">{row.applied}건</td>
                  <td data-label="대기" className="numeric">{row.open}건</td>
                  <td data-label="무시" className="numeric">{dismissed}건</td>
                  <td data-label="대기 중 예상 절약" className="numeric cell-money">{formatKrw(row.openSavingKrw)}</td>
                </tr>
              );
            })}
          </tbody>
          {rows.length > 1 && (
            <tfoot>
              <tr>
                <th scope="row" colSpan={5}>
                  합계
                </th>
                <td data-label="합계" className="numeric cell-money">{formatKrw(waiting)}</td>
              </tr>
            </tfoot>
          )}
        </table>
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
  const [filter, setFilter] = useState<(typeof CALL_FILTERS)[number]["value"]>("all");
  const shown = activity.calls.filter(
    (call) => filter === "all" || (filter === "actions" ? call.tier === "approve" : callHasProblem(call)),
  );
  const groups = groupCalls(shown);

  return (
    <section aria-labelledby="calls-heading" className="pane">
      <div className="pane-head">
        <h2 id="calls-heading">최근 실행 명령</h2>
        <div className="segmented" role="group" aria-label="명령 필터">
          {CALL_FILTERS.map((option) => (
            <button key={option.value} type="button" aria-pressed={option.value === filter} onClick={() => setFilter(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {activity.calls.length === 0 && <p className="status">아직 실행한 명령이 없습니다.</p>}
      {activity.calls.length > 0 && groups.length === 0 && <p className="status">해당하는 명령이 없습니다.</p>}
      {groups.map((calls, index) => {
        const problems = calls.filter(callHasProblem).length;
        return (
          // Keyed by filter too: switching filters resets which group starts open.
          <details key={`${filter}-${calls[0].consultationId}`} className="call-group" open={index === 0}>
            <summary>
              <span className="cell-stack">
                <strong>{calls[0].serverName}</strong>
                <span className="caption">{formatDateTime(calls[0].requestedAt)}</span>
              </span>
              <span className="call-count">
                명령 {calls.length}개{problems > 0 && <em>문제 {problems}개</em>}
              </span>
            </summary>
            <ol className="call-list">
              {calls.map((call) => (
                <li key={call.id} className={callHasProblem(call) ? "call call-problem" : "call"}>
                  <code>{call.command}</code>
                  <span className="call-result">{outcome(call)}</span>
                </li>
              ))}
            </ol>
            <p className="call-more">
              <Link href={`/consultations/${calls[0].consultationId}`}>컨설팅 보기</Link>
            </p>
          </details>
        );
      })}
    </section>
  );
}
