import { Link } from "react-router-dom";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Panel } from "@/components/Panel";
import { PowerChart } from "@/components/PowerChart";
import { Power } from "@/components/Power";
import { Failure, Loading, OnlineState } from "@/components/Status";
import { api, clearApiCache, useApi, useSubmit } from "@/lib/api";
import { useServers } from "@/AppLayout";
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
import { setOrbit } from "@/lib/orbit";
import styled from "styled-components";
import { ChartHead, Row, RowMain } from "@/styles";

const RANGES = [
  { value: "1h", label: "1시간", ms: 3_600_000 },
  { value: "24h", label: "24시간", ms: 86_400_000 },
  { value: "7d", label: "7일", ms: 604_800_000 },
];

export default function ServerPage() {
  return <ServerPageBody key={useParams().id} />;
}

function ServerPageBody() {
  const { id } = useParams();
  const { data: server, error, reload, mutate } = useApi(`/api/servers/${id}`);
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

  // Mark the server's place on the planet while its page is open. `location` is a city-level
  // guess from the agent's public IP: null for private networks or a failed lookup.
  const lat = server?.location?.lat;
  const lon = server?.location?.lon;
  useEffect(() => {
    if (lat === undefined || lon === undefined) return;
    setOrbit({ pin: { lat, lon } });
    return () => setOrbit({ pin: null });
  }, [lat, lon]);

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
      <ServerState>
        {KIND_LABEL[server.kind]} · <OnlineState online={server.online} />
        {!server.online && server.lastSeenAt && <span className="muted"> · 마지막 연결 {formatDateTime(server.lastSeenAt)}</span>}
        {server.location && <span className="muted"> · {server.location.label || "위치"} (IP 추정)</span>}
      </ServerState>
      {server.online ? <Power value={server.latestWatts} estimated={estimated} size="xl" /> : <span className="figure-lg muted">꺼짐</span>}
      {!estimated && <Note className="muted">CPU와 GPU 센서의 합계입니다. 메인보드, 디스크, 전원부 손실은 빠져 있어 벽에서 잰 값보다 낮습니다.</Note>}
      <Figures>
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
      </Figures>
      <Chart serverId={serverId} />
      <Recommendations serverId={serverId} />
      <Processes serverId={serverId} />
      <Consultations serverId={serverId} />
      <DeleteServer serverId={serverId} name={server.name} />
    </Panel>
  );
}

function Chart({ serverId }) {
  const [range, setRange] = useState(RANGES[1]);
  const { data, error, reload, mutate } = useApi(`/api/servers/${serverId}/metrics?range=${range.value}`);

  useLive((event) => {
    if (event.type === "reconnected") reload();
    // The 7d series is coarse; one 10-second sample would not belong on it.
    if (event.type === "metric" && event.serverId === serverId && range.value !== "7d") {
      mutate((metrics) => appendMetric(metrics, event.metric, range.ms));
    }
  });

  return (
    <section aria-label="전력 그래프" className="section">
      <ChartHead>
        <Segmented role="group" aria-label="기간">
          {RANGES.map((option) => (
            <button key={option.value} type="button" aria-pressed={option === range} onClick={() => setRange(option)}>
              {option.label}
            </button>
          ))}
        </Segmented>
      </ChartHead>
      <ChartSlot>
        {error && <Failure error={error} retry={reload} />}
        {!error && !data && <Loading />}
        {data?.length === 0 && <p className="muted">이 기간에는 측정값이 없습니다.</p>}
        {data && data.length > 0 && <PowerChart metrics={data} showDays={range.value === "7d"} windowMs={range.ms} />}
      </ChartSlot>
    </section>
  );
}

function Processes({ serverId }) {
  const { data, error, reload, mutate } = useApi(`/api/servers/${serverId}/processes`);

  useLive((event) => {
    if (event.type === "reconnected") reload();
    if (event.type === "metric" && event.serverId === serverId) mutate(() => event.processes);
  });

  return (
    <section aria-labelledby="processes-heading" className="section">
      <SectionHead>
        <h2 id="processes-heading">전력 상위 프로세스</h2>
      </SectionHead>
      {error && <Failure error={error} retry={reload} />}
      {!error && !data && <Loading />}
      {data?.length === 0 && <p className="muted">아직 수집된 프로세스가 없습니다.</p>}
      {data && data.length > 0 && (
        <ul className="rows">
          {data.map((process) => (
            <Row key={process.pid}>
              <RowMain>
                <code>{process.name}</code>
                <span className="muted">PID {process.pid} · CPU {process.cpuPct.toFixed(1)}%</span>
              </RowMain>
              {/* A share of the total by CPU time: derived, so always 추정. */}
              <Power value={process.watts} estimated />
            </Row>
          ))}
        </ul>
      )}
    </section>
  );
}

const RECOMMENDATION_STATUS = {
  open: "",
  applied: "적용됨",
  dismissed: "무시함",
};

function Recommendations({ serverId }) {
  const { data, error, reload, mutate } = useApi(`/api/servers/${serverId}/recommendations`);

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
      <SectionHead>
        <h2 id="recommendations-heading">추천</h2>
        {open.length > 0 && (
          <span className="muted">
            대기 {open.length}건{saving > 0 && ` · 예상 ${formatKrw(saving)}`}
          </span>
        )}
      </SectionHead>
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
}) {
  const { busy, error, run } = useSubmit();

  const apply = () =>
    run(async () => onChange(await api(`/api/recommendations/${item.id}/apply`, { method: "POST" })));
  const unapply = () =>
    run(async () => onChange(await api(`/api/recommendations/${item.id}/unapply`, { method: "POST" })));
  const dismiss = () =>
    run(async () => onChange(await api(`/api/recommendations/${item.id}/dismiss`, { method: "POST" })));

  return (
    <Entry className={item.status === "open" ? undefined : "is-closed"}>
      <details open={defaultOpen}>
        <summary>
          <EntryTitle>
            {recommendationTypeLabel(item.type)}
            <span className="muted">
              {SOURCE_LABEL[item.source]} 추천
              {item.status !== "open" && ` · ${RECOMMENDATION_STATUS[item.status]}`}
            </span>
          </EntryTitle>
          {item.estSavingKrw > 0 && <EntrySaving>{formatKrw(item.estSavingKrw)}</EntrySaving>}
        </summary>
        <EntryDetail>{item.detail}</EntryDetail>
        {error && (
          <EntryDetail className="error" role="alert">
            {error}
          </EntryDetail>
        )}
        {item.status === "open" && (
          <EntryActions>
            <Link to={`/servers/${item.serverId}/recommendations/${item.id}`} className="btn btn-go">
              적용 방법 보기
            </Link>
            <button type="button" className="btn btn-quiet" onClick={apply} disabled={busy}>
              적용했어요
            </button>
            <button type="button" className="btn btn-quiet" onClick={dismiss} disabled={busy}>
              무시
            </button>
          </EntryActions>
        )}
        {item.status === "applied" && (
          <EntryActions>
            <button type="button" className="btn btn-quiet" onClick={unapply} disabled={busy}>
              적용 취소
            </button>
          </EntryActions>
        )}
      </details>
    </Entry>
  );
}

function Consultations({ serverId }) {
  const navigate = useNavigate();
  const { data, error, reload, mutate } = useApi(`/api/servers/${serverId}/consultations`);
  const { busy, error: startError, run } = useSubmit();
  // Unset until the owner picks: the last run's settings are the ones known to work on this server.
  const [picked, setPicked] = useState({});

  useLive((event) => {
    if (event.type === "reconnected") reload();
    if (event.type === "consultation" && event.consultation.serverId === serverId) {
      mutate((list) => upsertById(list, event.consultation));
    }
  });

  const history = data?.toSorted((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt));
  const authMode = picked.authMode ?? history?.[0]?.authMode ?? "subscription";
  const model = picked.model ?? history?.[0]?.model ?? MODELS[0].value;

  const start = (event) => {
    event.preventDefault();
    return run(async () => {
      const created = await api(`/api/servers/${serverId}/consultations`, {
        method: "POST",
        body: { authMode, model },
      });
      navigate(`/consultations/${created.id}`);
    });
  };

  return (
    <>
    <section aria-labelledby="consultations-heading" className="section">
      <SectionHead>
        <h2 id="consultations-heading">AI 컨설팅</h2>
      </SectionHead>
      <ConsultStart onSubmit={start}>
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
      </ConsultStart>

    </section>
    <section aria-labelledby="history-heading" className="section">
      <SectionHead>
        <h2 id="history-heading">컨설팅 기록</h2>
      </SectionHead>
      {error && <Failure error={error} retry={reload} />}
      {!error && !data && <Loading />}
      {data?.length === 0 && <p className="muted">아직 진행한 컨설팅이 없습니다.</p>}
      {history && history.length > 0 && (
        <ul className="rows">
          {history.map((item) => (
            <li key={item.id}>
              <HistoryLink to={`/consultations/${item.id}`}>
                <span>{formatDateTime(item.requestedAt)}</span>
                <span className="muted">
                  {CONSULTATION_STATUS[item.status]}
                  {item.level && ` · ${SERVER_LEVELS.find((level) => level.value === item.level)?.label}`}
                </span>
                {item.summary && <HistorySummary>{item.summary}</HistorySummary>}
              </HistoryLink>
            </li>
          ))}
        </ul>
      )}
    </section>
    </>
  );
}

const ServerState = styled.p`
  margin: 0 0 0.5lh;
  color: var(--ink-2);
`;

const Note = styled.p`
  max-width: 64ch;
  margin: 0.5lh 0 0;
`;

const Figures = styled.dl`
  .panel & {
    display: grid;
    grid-template-columns: repeat(3, auto);
    justify-content: start;
    gap: 0 4ch;
    margin: 1lh 0 0;
  }
  .panel & dt {
    color: var(--ink-2);
  }
  .panel & dd {
    margin: 0;
    font-weight: 700;
  }

  @media (max-width: 759.98px) {
    .panel & {
      grid-template-columns: 1fr;
    }
  }
`;

const SectionHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 2ch;
`;

const ChartSlot = styled.div`
  min-width: 0;
  min-height: 15lh;
`;

/* Range picker: [1시간] [24시간] [7일], the chosen one reversed. */
const Segmented = styled.div`
  .panel & {
    display: inline-flex;
    gap: 1ch;
  }
  .panel & button {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ink-2);
    font: inherit;
    line-height: inherit;
    cursor: pointer;
  }
  .panel & button::before {
    content: "[";
  }
  .panel & button::after {
    content: "]";
  }
  .panel & button:hover,
  .panel & button:focus-visible {
    color: var(--ink);
    outline: 0;
  }
  .panel & button[aria-pressed="true"] {
    background: var(--go);
    color: var(--on-go);
    font-weight: 700;
  }
`;

/* Recommendations and history */
const EntryTitle = styled.span`
  display: grid;
  padding-left: 2ch;
  font-weight: 700;

  &::before {
    content: "▸";
    position: absolute;
    margin-left: -2ch;
    color: var(--ink-2);
  }
  details[open] &::before {
    content: "▾";
  }
  & .muted {
    font-weight: 400;
  }
`;

const Entry = styled.li`
  & summary {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 2ch;
    list-style: none;
    cursor: pointer;
  }
  & summary::-webkit-details-marker {
    display: none;
  }
  & summary:hover ${EntryTitle} > :first-child,
  & summary:focus-visible ${EntryTitle} > :first-child {
    background: var(--ink);
    color: var(--paper);
  }
  & summary:focus-visible {
    outline: 0;
  }
  &.is-closed ${EntryTitle} {
    color: var(--ink-2);
  }
`;

const EntrySaving = styled.span`
  color: var(--go);
  font-weight: 700;
`;

const EntryDetail = styled.p`
  margin: 0.5lh 0 0;

  /* The error line keeps .error's margin: that rule used to win the tie by coming later. */
  &.error {
    margin: 0;
  }
`;

const EntryActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0 2ch;
  margin-top: 0.5lh;
`;

const HistoryLink = styled(Link)`
  display: grid;
  color: inherit;
  text-decoration: none;

  &:hover > span:first-child,
  &:focus-visible > span:first-child {
    background: var(--ink);
    color: var(--paper);
  }
`;

const HistorySummary = styled.span`
  color: var(--ink-2);
`;

/* Radio choices: ( ) 구독  (•) API 키 */
const ConsultStart = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.5lh 2ch;

  & .choice {
    display: flex;
    gap: 2ch;
    margin: 0;
    padding: 0;
    border: 0;
  }
  & legend {
    padding: 0;
    color: var(--ink-2);
  }
  & .choice label {
    display: inline-flex;
    gap: 1ch;
    cursor: pointer;
  }
  & .choice input {
    appearance: none;
    margin: 0;
    font: inherit;
    cursor: pointer;
  }
  & .choice input::before {
    content: "( )";
    color: var(--ink-2);
  }
  & .choice input:checked::before {
    content: "(•)";
    color: var(--go);
  }
  & .choice label:has(input:checked) {
    font-weight: 700;
  }
  & .choice input:focus-visible {
    outline: 1px solid var(--go);
  }
  & .error {
    flex-basis: 100%;
  }
`;

/** Removes the server and everything recorded for it, then returns to the list. */
function DeleteServer({ serverId, name }) {
  const navigate = useNavigate();
  const { reload } = useServers();
  return (
    <ConfirmDelete
      id="delete-server"
      heading="서버 삭제"
      label="서버 삭제"
      warning={`${name} 서버와 측정값, 추천, 상담 기록이 모두 지워집니다. 되돌릴 수 없습니다. 정말 삭제할까요?`}
      onConfirm={async () => {
        await api(`/api/servers/${serverId}`, { method: "DELETE" });
        clearApiCache();
        reload();
        navigate("/servers", { replace: true });
      }}
    />
  );
}
