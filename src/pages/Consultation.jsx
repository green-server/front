import { useParams } from "react-router-dom";
import { Panel } from "@/components/Panel";
import { Session, useConsultation } from "@/components/Session";
import { Failure, Loading } from "@/components/Status";
import { api, useApi, useSubmit } from "@/lib/api";
import { AUTH_MODE_LABEL, CONSULTATION_STATUS, formatDateTime, outcome, SERVER_LEVELS, TIER_LABEL, undoState } from "@/lib/format";
import styled from "styled-components";
import { AskActions, ConsultList, ConsultSummary } from "@/styles";

export default function ConsultationPage() {
  return <ConsultationPageBody key={useParams().id} />;
}

function ConsultationPageBody() {
  const { id } = useParams();
  const { data, error, reload, putCall } = useConsultation(Number(id));
  const servers = useApi("/api/servers");
  const back = { to: data ? `/servers/${data.serverId}` : "/", label: servers.data?.find((s) => s.id === data?.serverId)?.name ?? "서버" };

  if (error) return <Panel title="AI 컨설팅" back={back}><Failure error={error} retry={reload} /></Panel>;
  if (!data) return <Panel title="AI 컨설팅" back={back}><Loading /></Panel>;

  const pending = data.toolCalls.filter((call) => call.decision === "pending");
  const log = data.toolCalls.filter((call) => call.decision !== "pending");
  const active = data.status === "requested" || data.status === "running";

  return (
    <Panel title="AI 컨설팅" back={back}>
      <title>AI 컨설팅 · Green Server</title>
      <Meta>
        <div>
          <dt>상태</dt>
          <dd>
            <span role="status">{CONSULTATION_STATUS[data.status]}</span>
          </dd>
        </div>
        <div>
          <dt>요청 시각</dt>
          <dd>{formatDateTime(data.requestedAt)}</dd>
        </div>
        <div>
          <dt>인증 방식</dt>
          <dd>{AUTH_MODE_LABEL[data.authMode]}</dd>
        </div>
      </Meta>

      <div aria-live="polite">
        {pending.length > 0 && (
          <section aria-labelledby="pending-heading" className="section">
            <h2 id="pending-heading">권한 요청</h2>
            <p className="muted">10분 안에 결정하지 않으면 거절로 처리됩니다.</p>
            {pending.map((call) => (
              <PendingCall key={call.id} call={call} onChange={putCall} />
            ))}
          </section>
        )}
      </div>

      {(active || data.stream.length > 0) && <Session entries={data.stream} active={active} />}

      <div>
        {(data.level || data.summary || data.feedback.length > 0 || data.fixes.length > 0) && (
          <section aria-labelledby="report-heading" className="section">
            <h2 id="report-heading">진단</h2>
            {data.level && <LevelSteps level={data.level} />}
            {data.summary && <ConsultSummary>{data.summary}</ConsultSummary>}
            {data.feedback.length > 0 && (
              <ConsultSection>
                <h3>피드백</h3>
                <ConsultList>
                  {data.feedback.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ConsultList>
              </ConsultSection>
            )}
            {data.fixes.length > 0 && (
              <ConsultSection>
                <h3>해결 방법</h3>
                <ConsultList as="ol">
                  {data.fixes.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ConsultList>
              </ConsultSection>
            )}
          </section>
        )}

        <section aria-labelledby="log-heading" className="section">
          <h2 id="log-heading">실행 기록</h2>
          {log.length === 0 ? (
            <p className="muted">아직 실행한 명령이 없습니다.</p>
          ) : (
            <ToolLog>
              {log.map((call) => (
                <LogEntry key={call.id} call={call} calls={data.toolCalls} onChange={putCall} />
              ))}
            </ToolLog>
          )}
        </section>
      </div>
    </Panel>
  );
}

function PendingCall({ call, onChange }) {
  const { busy, error, run } = useSubmit();

  const decide = (decision) =>
    run(async () => onChange(await api(`/api/tool-calls/${call.id}/decision`, { method: "POST", body: { decision } })));

  return (
    <Ask>
      <AskLabel>
        실행할 명령어 <span className="tag">{TIER_LABEL[call.tier]}</span>
      </AskLabel>
      <Command text={call.command} />
      <AskLabel>되돌리는 명령어</AskLabel>
      {call.undoCommand ? <Command text={call.undoCommand} undo /> : <p className="muted">기록된 명령어가 없어 되돌릴 수 없습니다.</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <AskActions>
        <button type="button" className="btn btn-go" disabled={busy} onClick={() => decide("approved")}>
          허용
        </button>
        <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => decide("denied")}>
          거절
        </button>
      </AskActions>
    </Ask>
  );
}

function LogEntry({ call, calls, onChange }) {
  const { busy, error, run } = useSubmit();
  const undo = undoState(call, calls);

  const requestUndo = () =>
    run(async () => onChange(await api(`/api/tool-calls/${call.id}/undo`, { method: "POST" })));

  return (
    <ToolEntry className={`is-${call.decision}`}>
      <Command text={call.command} />
      <ToolState>
        {call.undoOf !== null && <span>되돌리기</span>}
        <span>{TIER_LABEL[call.tier]}</span>
        <span>{outcome(call)}</span>
      </ToolState>
      {call.undoCommand && (
        <ToolUndo>
          <span className="muted">되돌리는 명령어</span>
          <Command text={call.undoCommand} undo />
        </ToolUndo>
      )}
      {undo === "running" && <p className="muted">되돌리는 중</p>}
      {undo === "done" && <p className="muted">되돌림</p>}
      {undo === "failed" && <p className="error">되돌리지 못했습니다.</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {(undo === "ready" || undo === "failed") && (
        <button type="button" className="btn" disabled={busy} onClick={requestUndo}>
          되돌리기
        </button>
      )}
    </ToolEntry>
  );
}

function Command({ text, undo }) {
  return (
    <CommandBox className={undo ? "command-undo" : undefined} translate="no">
      <code>{text}</code>
    </CommandBox>
  );
}

function LevelSteps({ level }) {
  return (
    <ConsultSection>
      <h3 id="level-heading">서버 상태</h3>
      <Steps aria-labelledby="level-heading">
        {SERVER_LEVELS.map((step, index) => (
          <li key={step.value} data-level={step.value} aria-current={step.value === level ? "step" : undefined}>
            <span>{index + 1}단계</span> {step.label}
          </li>
        ))}
      </Steps>
    </ConsultSection>
  );
}

const Meta = styled.dl`
  display: flex;
  flex-wrap: wrap;
  gap: 0 4ch;
  margin: 0;

  & dt {
    color: var(--ink-2);
  }
  & dd {
    margin: 0;
  }
`;

const ConsultSection = styled.div`
  & + & {
    margin-top: 1lh;
  }
`;

/* [1단계 좋음] [2단계 보통] …, the current step reversed in its colour. */
const Steps = styled.ol`
  display: flex;
  flex-wrap: wrap;
  gap: 0 1ch;
  margin: 0;
  padding: 0;
  list-style: none;

  & li {
    color: var(--ink-2);
    white-space: nowrap;
  }
  & li::before {
    content: "[";
  }
  & li::after {
    content: "]";
  }
  & [aria-current] {
    background: var(--go);
    color: var(--on-go);
    font-weight: 700;
  }
  & [aria-current][data-level="warning"] {
    background: var(--warn);
  }
  & [aria-current][data-level="critical"] {
    background: var(--bad);
  }
`;

/* The command is the thing being approved: never truncated, always wraps, framed. */
const CommandBox = styled.pre`
  position: relative;
  margin: 0;
  padding: 1lh 2ch 1lh 4ch;
  color: var(--ink);
  font: inherit;
  white-space: pre-wrap;
  overflow-wrap: anywhere;

  &::before {
    content: "$";
    position: absolute;
    left: 2ch;
    color: var(--go);
  }
  &::after {
    content: "";
    position: absolute;
    inset: 0.5lh 0.5ch;
    border: 1px solid var(--line);
    pointer-events: none;
  }

  &.command-undo {
    padding: 0 0 0 2ch;
    color: var(--ink-2);
  }
  &.command-undo::before {
    left: 0;
    color: var(--ink-2);
  }
  &.command-undo::after {
    content: none;
  }
`;

const Ask = styled.article`
  position: relative;
  display: grid;
  margin-top: 0.5lh;
  padding: 1lh 2ch;

  &::before {
    content: "";
    position: absolute;
    inset: 0.5lh 0.5ch;
    border: 1px solid var(--warn);
    pointer-events: none;
  }
  & ${AskActions} {
    margin-top: 0.5lh;
  }
`;

const AskLabel = styled.p`
  display: flex;
  align-items: center;
  gap: 1ch;
  margin: 0.5lh 0 0;
  color: var(--ink-2);

  &:first-child {
    margin-top: 0;
  }
`;

const ToolLog = styled.ol`
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const ToolState = styled.p`
  display: flex;
  flex-wrap: wrap;
  gap: 0 2ch;
  margin: 0;
  color: var(--ink-2);
`;

const ToolEntry = styled.li`
  display: grid;
  justify-items: start;
  padding: 0.5lh 0;
  border-top: 1px dashed var(--line);

  &:first-child {
    border-top: 0;
    padding-top: 0;
  }
  & ${CommandBox} {
    justify-self: stretch;
  }
  &.is-denied ${ToolState},
  &.is-blocked ${ToolState} {
    color: var(--bad);
  }
`;

const ToolUndo = styled.div`
  justify-self: stretch;
`;
