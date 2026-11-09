import { Link } from "react-router";
import { useNavigate, useParams } from "react-router";
import { useState, type FormEvent } from "react";
import { Panel } from "@/components/Panel";
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
  formatNumber,
  KIND_LABEL,
  isServerEstimated,
  recommendationTypeLabel,
  SOURCE_LABEL,
  upsertById,
} from "@/lib/format";
import { useLive } from "@/lib/live";
import "@/styles/server.css";
import type { Consultation, Metric, ProcessSample, Recommendation, ServerSummary } from "@/lib/types";

const RANGES = [
  { value: "1h", label: "1시간", ms: 3_600_000 },
  { value: "24h", label: "24시간", ms: 86_400_000 },
  { value: "7d", label: "7일", ms: 604_800_000 },
];

export default function ServerPage() {
  const { id } = useParams() as { id: string };
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

  if (error)
    return (
      <Panel title="서버" back={{ to: "/servers", label: "서버" }}>
        <Failure error={error} retry={reload} />
      </Panel>
    );
  if (!server)
    return (
      <Panel title="서버" back={{ to: "/servers", label: "서버" }}>
        <Loading />
      </Panel>
    );

  const estimated = isServerEstimated(server);

  return (
    <Panel title={server.name} back={{ to: "/servers", label: "서버" }}>
      <title>{`${server.name} · Green Server`}</title>
      <p className="server-state">
        {KIND_LABEL[server.kind]} · <OnlineState online={server.online} />
        {!server.online && server.lastSeenAt && <span className="muted"> · 마지막 연결 {formatDateTime(server.lastSeenAt)}</span>}
      </p>
      <Power value={server.latestWatts} estimated={estimated} size="xl" />
      {!estimated && <p className="muted note">CPU와 GPU 센서의 합계입니다. 메인보드, 디스크, 전원부 손실은 빠져 있어 벽에서 잰 값보다 낮습니다.</p>}
      <dl className="figures">
        <div>
          <dt>이번 달 예상 요금</dt>
          <dd>{formatKrw(server.monthlyKrw)}</dd>
        </div>
        <div>
          <dt>이번 달 예상 사용량</dt>
          <dd>
            {/* A projection, so never 실측, whatever the samples behind it were. */}
            <Power value={server.monthlyKwh} estimated unit="kWh" />
          </dd>
        </div>
        <div>
          <dt>이번 달 CO₂</dt>
          <dd>{formatNumber(server.monthlyCo2Kg)}kg</dd>
        </div>
      </dl>
      <Chart serverId={serverId} />
      <Recommendations serverId={serverId} />
      <Processes serverId={serverId} />
      <Consultations serverId={serverId} />
    </Panel>
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
    <section aria-label="전력 그래프" className="section">
      <div className="chart-head">
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
        {data?.length === 0 && <p className="muted">이 기간에는 측정값이 없습니다.</p>}
        {data && data.length > 0 && <PowerChart metrics={data} showDays={range.value === "7d"} windowMs={range.ms} />}
      </div>
    </section>
  );
}

function Processes({ serverId }: { serverId: number }) {
  const { data, error, reload, mutate } = useApi<ProcessSample[]>(`/api/servers/${serverId}/processes`);

  useLive((event) => {
    if (event.type === "reconnected") reload();
    if (event.type === "metric" && event.serverId === serverId) mutate(() => event.processes);
  });

  return (
    <section aria-labelledby="processes-heading" className="section">
      <div className="section-head">
        <h2 id="processes-heading">전력 상위 프로세스</h2>
      </div>
      {error && <Failure error={error} retry={reload} />}
      {!error && !data && <Loading />}
      {data?.length === 0 && <p className="muted">아직 수집된 프로세스가 없습니다.</p>}
      {data && data.length > 0 && (
        <ul className="rows">
          {data.map((process) => (
            <li key={process.pid} className="row">
              <span className="row-main">
                <code>{process.name}</code>
                <span className="muted">PID {process.pid} · CPU {process.cpuPct.toFixed(1)}%</span>
              </span>
              {/* A share of the total by CPU time: derived, so always 추정. */}
              <Power value={process.watts} estimated />
            </li>
          ))}
        </ul>
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

  // What is still open comes first, biggest saving on top.
  const ordered = data?.toSorted(
    (a, b) => Number(b.status === "open") - Number(a.status === "open") || b.estSavingKrw - a.estSavingKrw,
  );
  const open = data?.filter((item) => item.status === "open") ?? [];
  const saving = open.reduce((sum, item) => sum + item.estSavingKrw, 0);

  return (
    <section aria-labelledby="recommendations-heading" className="section">
      <div className="section-head">
        <h2 id="recommendations-heading">추천</h2>
        {open.length > 0 && (
          <span className="muted">
            대기 {open.length}건{saving > 0 && ` · 예상 ${formatKrw(saving)}`}
          </span>
        )}
      </div>
      {error && <Failure error={error} retry={reload} />}
      {!error && !data && <Loading />}
      {data?.length === 0 && <p className="muted">지금은 추천할 조치가 없습니다.</p>}
      {ordered && ordered.length > 0 && (
        <ul className="rows">
          {ordered.map((item, index) => (
            <RecommendationEntry key={item.id} item={item} defaultOpen={index === 0} onChange={(next) => mutate((list) => upsertById(list, next))} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RecommendationEntry({
  item,
  defaultOpen,
  onChange,
}: {
  item: Recommendation;
  defaultOpen: boolean;
  onChange: (next: Recommendation) => void;
}) {
  const { busy, error, run } = useSubmit();

  const apply = () =>
    run(async () => onChange(await api<Recommendation>(`/api/recommendations/${item.id}/apply`, { method: "POST" })));
  const unapply = () =>
    run(async () => onChange(await api<Recommendation>(`/api/recommendations/${item.id}/unapply`, { method: "POST" })));
  const dismiss = () =>
    run(async () => onChange(await api<Recommendation>(`/api/recommendations/${item.id}/dismiss`, { method: "POST" })));

  return (
    <li className={item.status === "open" ? "entry" : "entry is-closed"}>
      <details open={defaultOpen}>
        <summary>
          <span className="entry-title">
            {recommendationTypeLabel(item.type)}
            <span className="muted">
              {SOURCE_LABEL[item.source]} 추천
              {item.status !== "open" && ` · ${RECOMMENDATION_STATUS[item.status]}`}
            </span>
          </span>
          {item.estSavingKrw > 0 && <span className="entry-saving">{formatKrw(item.estSavingKrw)}</span>}
        </summary>
        <p className="entry-detail">{item.detail}</p>
        {error && (
          <p className="error entry-detail" role="alert">
            {error}
          </p>
        )}
        {item.status === "open" && (
          <div className="entry-actions">
            <Link to={`/servers/${item.serverId}/recommendations/${item.id}`} className="btn btn-go">
              적용 방법 보기
            </Link>
            <button type="button" className="btn btn-quiet" onClick={apply} disabled={busy}>
              적용했어요
            </button>
            <button type="button" className="btn btn-quiet" onClick={dismiss} disabled={busy}>
              무시
            </button>
          </div>
        )}
        {item.status === "applied" && (
          <div className="entry-actions">
            <button type="button" className="btn btn-quiet" onClick={unapply} disabled={busy}>
              적용 취소
            </button>
          </div>
        )}
      </details>
    </li>
  );
}

function Consultations({ serverId }: { serverId: number }) {
  const navigate = useNavigate();
  const { data, error, reload, mutate } = useApi<Consultation[]>(`/api/servers/${serverId}/consultations`);
  const { busy, error: startError, run } = useSubmit();
  // Unset until the owner picks: the last run's settings are the ones known to work on this server.
  const [picked, setPicked] = useState<{ authMode?: string; model?: string }>({});

  useLive((event) => {
    if (event.type === "reconnected") reload();
    if (event.type === "consultation" && event.consultation.serverId === serverId) {
      mutate((list) => upsertById(list, event.consultation));
    }
  });

  const history = data?.toSorted((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt));
  const authMode = picked.authMode ?? history?.[0]?.authMode ?? "subscription";
  const model = picked.model ?? history?.[0]?.model ?? MODELS[0].value;

  const start = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    return run(async () => {
      const created = await api<Consultation>(`/api/servers/${serverId}/consultations`, {
        method: "POST",
        body: { authMode, model },
      });
      navigate(`/consultations/${created.id}`);
    });
  };

  return (
    <>
    <section aria-labelledby="consultations-heading" className="section">
      <div className="section-head">
        <h2 id="consultations-heading">AI 컨설팅</h2>
      </div>
      <form className="consult-start" onSubmit={start}>
        <label className="field">
          <span>AI 모델</span>
          <select name="model" value={model} onChange={(e) => setPicked({ ...picked, model: e.target.value })}>
            {MODELS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="choice">
          <legend>Claude 인증 방식</legend>
          <label>
            <input
              type="radio"
              name="authMode"
              value="api_key"
              checked={authMode === "api_key"}
              onChange={() => setPicked({ ...picked, authMode: "api_key" })}
            />{" "}
            API 키
          </label>
          <label>
            <input
              type="radio"
              name="authMode"
              value="subscription"
              checked={authMode === "subscription"}
              onChange={() => setPicked({ ...picked, authMode: "subscription" })}
            />{" "}
            구독
          </label>
        </fieldset>
        <button className="btn btn-go" disabled={busy}>
          컨설팅 시작
        </button>
        {startError && (
          <p className="error" role="alert">
            {startError}
          </p>
        )}
      </form>

    </section>
    <section aria-labelledby="history-heading" className="section">
      <div className="section-head">
        <h2 id="history-heading">컨설팅 기록</h2>
      </div>
      {error && <Failure error={error} retry={reload} />}
      {!error && !data && <Loading />}
      {data?.length === 0 && <p className="muted">아직 진행한 컨설팅이 없습니다.</p>}
      {history && history.length > 0 && (
        <ul className="rows">
          {history.map((item) => (
            <li key={item.id}>
              <Link to={`/consultations/${item.id}`} className="history-link">
                <span>{formatDateTime(item.requestedAt)}</span>
                <span className="muted">
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
    </>
  );
}
