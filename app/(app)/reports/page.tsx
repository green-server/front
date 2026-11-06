"use client";

import Link from "next/link";
import { Krw, Power } from "@/components/Power";
import { Failure, Loading } from "@/components/Status";
import { useApi } from "@/lib/api";
import { formatDateTime, formatKrw, recommendationTypeLabel, reportItemEstimated, SOURCE_LABEL } from "@/lib/format";
import { useLive } from "@/lib/live";
import type { SavingsReport, ServerSummary } from "@/lib/types";

const SOURCES = ["rule", "ai"] as const;

export default function ReportsPage() {
  const report = useApi<SavingsReport>("/api/reports/savings");
  const servers = useApi<ServerSummary[]>("/api/servers");

  useLive((event) => {
    if (event.type === "reconnected") {
      report.reload();
      servers.reload();
    }
  });

  const error = report.error ?? servers.error;
  const retry = () => {
    report.reload();
    servers.reload();
  };

  return (
    <>
      <title>절약 리포트 · Green Server</title>
      <div className="page-head">
        <h1>절약 리포트</h1>
      </div>
      {error && <Failure error={error} retry={retry} />}
      {!error && (!report.data || !servers.data) && <Loading />}
      {report.data && servers.data && <Report report={report.data} servers={servers.data} />}
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
    <div className="console">
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
                <th scope="col">서버</th>
                <th scope="col">조치</th>
                <th scope="col">적용 시각</th>
                <th scope="col" className="numeric">조치 전</th>
                <th scope="col" className="numeric">조치 후</th>
                <th scope="col" className="numeric">절약 전력량</th>
                <th scope="col" className="numeric">절약 금액</th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((item) => {
                const estimated = reportItemEstimated(item, servers);
                return (
                  <tr key={item.recommendationId}>
                    <td data-label="서버">{item.serverName}</td>
                    <td data-label="조치">
                      <span>
                        {recommendationTypeLabel(item.type)} <span className="caption">{SOURCE_LABEL[item.source]}</span>
                      </span>
                    </td>
                    <td data-label="적용 시각">{formatDateTime(item.appliedAt)}</td>
                    <td data-label="조치 전" className="numeric">
                      <Power value={item.beforeWatts} estimated={estimated} />
                    </td>
                    <td data-label="조치 후" className="numeric">
                      <Power value={item.afterWatts} estimated={estimated} />
                    </td>
                    <td data-label="절약 전력량" className="numeric">
                      <Power value={item.savedKwhMonth} estimated={estimated} unit="kWh/월" />
                    </td>
                    <td data-label="절약 금액" className="numeric figure">
                      {formatKrw(item.savedKrwMonth)}/월
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
