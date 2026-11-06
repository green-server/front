"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PowerChart } from "@/components/PowerChart";
import { Power } from "@/components/Power";
import { Failure, Loading, OnlineState } from "@/components/Status";
import { api, useApi, useSubmit } from "@/lib/api";
import {
  appendMetric,
  CONSULTATION_STATUS,
  MODELS,
  SERVER_LEVELS,
  formatDateTime,
  formatKrw,
  isServerEstimated,
  recommendationTypeLabel,
  SOURCE_LABEL,
  upsertById,
} from "@/lib/format";
import { useLive } from "@/lib/live";
import type { Consultation, Metric, ProcessSample, Recommendation, ServerSummary } from "@/lib/types";

const RANGES = [
  { value: "1h", label: "1시간", ms: 3_600_000 },
  { value: "24h", label: "24시간", ms: 86_400_000 },
  { value: "7d", label: "7일", ms: 604_800_000 },
];

export default function ServerPage() {
  const { id } = useParams<{ id: string }>();
  const { data: server, error, reload, mutate } = useApi<ServerSummary>(`/api/servers/${id}`);
  const serverId = Number(id);

  useLive((event) => {
    if (event.type === "reconnected") reload();
    if (event.type === "metric" && event.serverId === serverId) {
      mutate((s) => ({ ...s, latestWatts: event.metric.watts, isEstimated: event.metric.isEstimated }));
    }
    if (event.type === "agent_status" && event.serverId === serverId) {
      mutate((s) => ({ ...s, online: event.online }));
    }
  });

  if (error) return <Failure error={error} retry={reload} />;
  if (!server) return <Loading />;

  const estimated = isServerEstimated(server);

  return (
    <div className="instrument">
      <title>{`${server.name} · Green Server`}</title>
      <aside className="instrument-panel">
        <h1>{server.name}</h1>
        <p className="instrument-state">
          <OnlineState online={server.online} />
          {!server.online && server.lastSeenAt && <span className="caption">마지막 연결 {formatDateTime(server.lastSeenAt)}</span>}
        </p>
        <Power value={server.latestWatts} estimated={estimated} size="xl" />
        <dl className="instrument-figures">
          <div>
            <dt>이번 달 예상 요금</dt>
            <dd className="figure">{formatKrw(server.monthlyKrw)}</dd>
          </div>
          <div>
            <dt>이번 달 예상 사용량</dt>
            <dd>
              <Power value={server.monthlyKwh} estimated={estimated} unit="kWh" />
            </dd>
          </div>
        </dl>
      </aside>
      <div className="instrument-body">
        <Chart serverId={serverId} />
        <Processes serverId={serverId} estimated={estimated} />
        <Recommendations serverId={serverId} />
        <Consultations serverId={serverId} />
      </div>
    </div>
  );
}

function Chart({ serverId }: { serverId: number }) {
  const [range, setRange] = useState(RANGES[1]);
  const { data, error, reload, mutate } = useApi<Metric[]>(`/api/servers/${serverId}/metrics?range=${range.value}`);

  useLive((event) => {
    if (event.type === "reconnected") reload();
    // The 7d series is coarse; one 10-second sample would not belong on it.
    if (event.type === "metric" && event.serverId === serverId && range.value !== "7d") {
      mutate((metrics) => appendMetric(metrics, event.metric, range.ms));
    }
  });

  return (
    <section aria-labelledby="chart-heading">
      <div className="section-head">
        <h2 id="chart-heading">전력</h2>
        <div className="segmented" role="group" aria-label="기간">
          {RANGES.map((option) => (
            <button key={option.value} type="button" aria-pressed={option === range} onClick={() => setRange(option)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-slot">
        {error && <Failure error={error} retry={reload} />}
        {!error && !data && <Loading />}
        {data?.length === 0 && <p className="status">이 기간에는 측정값이 없습니다.</p>}
        {data && data.length > 0 && <PowerChart metrics={data} showDays={range.value === "7d"} />}
      </div>
    </section>
  );
}

function Processes({ serverId, estimated }: { serverId: number; estimated: boolean }) {
  const { data, error, reload } = useApi<ProcessSample[]>(`/api/servers/${serverId}/processes`);

  useLive((event) => {
    if (event.type === "reconnected" || (event.type === "metric" && event.serverId === serverId)) reload();
  });

  return (
    <section aria-labelledby="processes-heading">
      <h2 id="processes-heading">전력 상위 프로세스</h2>
      {error && <Failure error={error} retry={reload} />}
      {!error && !data && <Loading />}
      {data?.length === 0 && <p className="status">아직 수집된 프로세스가 없습니다.</p>}
      {data && data.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">프로세스</th>
              <th scope="col" className="numeric">PID</th>
              <th scope="col" className="numeric">CPU</th>
              <th scope="col" className="numeric">전력</th>
            </tr>
          </thead>
          <tbody>
            {data.map((process) => (
              <tr key={process.pid}>
                <td className="mono">{process.name}</td>
                <td className="numeric">{process.pid}</td>
                <td className="numeric">{process.cpuPct.toFixed(1)}%</td>
                <td className="numeric">
                  <Power value={process.watts} estimated={estimated} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

const RECOMMENDATION_STATUS: Record<Recommendation["status"], string> = {
  open: "",
  applied: "적용됨",
  dismissed: "무시함",
};

function Recommendations({ serverId }: { serverId: number }) {
  const { data, error, reload, mutate } = useApi<Recommendation[]>(`/api/servers/${serverId}/recommendations`);

  useLive((event) => {
    // A finished consultation is what creates or applies recommendations.
    if (event.type === "reconnected" || (event.type === "consultation" && event.consultation.serverId === serverId)) reload();
  });

  const ordered = data?.toSorted((a, b) => Number(b.status === "open") - Number(a.status === "open"));

  return (
    <section aria-labelledby="recommendations-heading">
      <h2 id="recommendations-heading">추천</h2>
      {error && <Failure error={error} retry={reload} />}
      {!error && !data && <Loading />}
      {data?.length === 0 && <p className="status">지금은 추천할 조치가 없습니다.</p>}
      {ordered && ordered.length > 0 && (
        <ul className="entries">
          {ordered.map((item) => (
            <RecommendationEntry key={item.id} item={item} onChange={(next) => mutate((list) => upsertById(list, next))} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RecommendationEntry({ item, onChange }: { item: Recommendation; onChange: (next: Recommendation) => void }) {
  const { busy, error, run } = useSubmit();

  const apply = () =>
    run(async () => onChange(await api<Recommendation>(`/api/recommendations/${item.id}/apply`, { method: "POST" })));
  const unapply = () =>
    run(async () => onChange(await api<Recommendation>(`/api/recommendations/${item.id}/unapply`, { method: "POST" })));
  const dismiss = () =>
    run(async () => onChange(await api<Recommendation>(`/api/recommendations/${item.id}/dismiss`, { method: "POST" })));

  return (
    <li className={item.status === "open" ? "entry" : "entry entry-closed"}>
      <div>
        <p className="entry-title">
          {recommendationTypeLabel(item.type)}
          <span className="caption">{SOURCE_LABEL[item.source]} 추천</span>
          {item.status !== "open" && <span className="caption">{RECOMMENDATION_STATUS[item.status]}</span>}
        </p>
        <p>{item.detail}</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="entry-side">
        <span className="caption">예상 절약</span>
        <span className="figure">{formatKrw(item.estSavingKrw)}</span>
        {item.status === "open" && (
          <div className="entry-actions">
            <button type="button" className="button" onClick={apply} disabled={busy}>
              적용했어요
            </button>
            <button type="button" className="button" onClick={dismiss} disabled={busy}>
              무시
            </button>
          </div>
        )}
        {item.status === "applied" && (
          <div className="entry-actions">
            <button type="button" className="button" onClick={unapply} disabled={busy}>
              적용 취소
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function Consultations({ serverId }: { serverId: number }) {
  const router = useRouter();
  const { data, error, reload, mutate } = useApi<Consultation[]>(`/api/servers/${serverId}/consultations`);
  const { busy, error: startError, run } = useSubmit();

  useLive((event) => {
    if (event.type === "reconnected") reload();
    if (event.type === "consultation" && event.consultation.serverId === serverId) {
      mutate((list) => upsertById(list, event.consultation));
    }
  });

  const start = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    return run(async () => {
      const created = await api<Consultation>(`/api/servers/${serverId}/consultations`, {
        method: "POST",
        body: { authMode: form.get("authMode"), model: form.get("model") },
      });
      router.push(`/consultations/${created.id}`);
    });
  };

  const history = data?.toSorted((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt));

  return (
    <section aria-labelledby="consultations-heading">
      <h2 id="consultations-heading">AI 컨설팅</h2>
      <form className="consult-start" onSubmit={start}>
        <label className="field">
          <span>AI 모델</span>
          <select name="model" defaultValue={MODELS[0].value}>
            {MODELS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Claude 인증 방식</legend>
          <label>
            <input type="radio" name="authMode" value="api_key" defaultChecked /> API 키
          </label>
          <label>
            <input type="radio" name="authMode" value="subscription" /> 구독
          </label>
        </fieldset>
        <button className="button button-primary" disabled={busy}>
          컨설팅 시작
        </button>
        {startError && (
          <p className="error" role="alert">
            {startError}
          </p>
        )}
      </form>

      {error && <Failure error={error} retry={reload} />}
      {!error && !data && <Loading />}
      {data?.length === 0 && <p className="status">아직 진행한 컨설팅이 없습니다.</p>}
      {history && history.length > 0 && (
        <ul className="history">
          {history.map((item) => (
            <li key={item.id}>
              <Link href={`/consultations/${item.id}`}>
                <span>{formatDateTime(item.requestedAt)}</span>
                <span className="caption">
                  {CONSULTATION_STATUS[item.status]}
                  {item.level && ` · ${SERVER_LEVELS.find((level) => level.value === item.level)?.label}`}
                </span>
                {item.summary && <span className="history-summary">{item.summary}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
