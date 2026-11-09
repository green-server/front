import { useParams } from "react-router";
import { Panel } from "@/components/Panel";
import { Session, useConsultation } from "@/components/Session";
import { Failure, Loading } from "@/components/Status";
import { api, useApi, useSubmit } from "@/lib/api";
import { AUTH_MODE_LABEL, CONSULTATION_STATUS, formatDateTime, outcome, SERVER_LEVELS, TIER_LABEL, undoState } from "@/lib/format";
import "@/styles/consult.css";
import type { ServerLevel, ServerSummary, ToolCall } from "@/lib/types";

export default function ConsultationPage() {
  const { id } = useParams() as { id: string };
  const { data, error, reload, putCall } = useConsultation(Number(id));
  const servers = useApi<ServerSummary[]>("/api/servers");
  const back = { to: data ? `/servers/${data.serverId}` : "/", label: servers.data?.find((s) => s.id === data?.serverId)?.name ?? "서버" };

  if (error) return <Panel title="AI 컨설팅" back={back}><Failure error={error} retry={reload} /></Panel>;
  if (!data) return <Panel title="AI 컨설팅" back={back}><Loading /></Panel>;

  const pending = data.toolCalls.filter((call) => call.decision === "pending");
  const log = data.toolCalls.filter((call) => call.decision !== "pending");
  const active = data.status === "requested" || data.status === "running";

  return (
    <Panel title="AI 컨설팅" back={back}>
      <title>AI 컨설팅 · Green Server</title>
      <dl className="consult-meta">
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
      </dl>

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
            {data.summary && <p className="consult-summary">{data.summary}</p>}
            {data.feedback.length > 0 && (
              <div className="consult-section">
                <h3>피드백</h3>
                <ul className="consult-list">
                  {data.feedback.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.fixes.length > 0 && (
              <div className="consult-section">
                <h3>해결 방법</h3>
                <ol className="consult-list">
                  {data.fixes.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        )}

        <section aria-labelledby="log-heading" className="section">
          <h2 id="log-heading">실행 기록</h2>
          {log.length === 0 ? (
            <p className="muted">아직 실행한 명령이 없습니다.</p>
          ) : (
            <ol className="tool-log">
              {log.map((call) => (
                <LogEntry key={call.id} call={call} calls={data.toolCalls} onChange={putCall} />
              ))}
            </ol>
          )}
        </section>
      </div>
    </Panel>
  );
}

function PendingCall({ call, onChange }: { call: ToolCall; onChange: (call: ToolCall) => void }) {
  const { busy, error, run } = useSubmit();

  const decide = (decision: "approved" | "denied") =>
    run(async () => onChange(await api<ToolCall>(`/api/tool-calls/${call.id}/decision`, { method: "POST", body: { decision } })));

  return (
    <article className="ask">
      <p className="ask-label">
        실행할 명령어 <span className="tag">{TIER_LABEL[call.tier]}</span>
      </p>
      <Command text={call.command} />
      <p className="ask-label">되돌리는 명령어</p>
      {call.undoCommand ? <Command text={call.undoCommand} undo /> : <p className="muted">기록된 명령어가 없어 되돌릴 수 없습니다.</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="ask-actions">
        <button type="button" className="btn btn-go" disabled={busy} onClick={() => decide("approved")}>
          허용
        </button>
        <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => decide("denied")}>
          거절
        </button>
      </div>
    </article>
  );
}

function LogEntry({ call, calls, onChange }: { call: ToolCall; calls: ToolCall[]; onChange: (call: ToolCall) => void }) {
  const { busy, error, run } = useSubmit();
  const undo = undoState(call, calls);

  const requestUndo = () =>
    run(async () => onChange(await api<ToolCall>(`/api/tool-calls/${call.id}/undo`, { method: "POST" })));

  return (
    <li className={`tool-entry is-${call.decision}`}>
      <Command text={call.command} />
      <p className="tool-state">
        {call.undoOf !== null && <span>되돌리기</span>}
        <span>{TIER_LABEL[call.tier]}</span>
        <span>{outcome(call)}</span>
      </p>
      {call.undoCommand && (
        <div className="tool-undo">
          <span className="muted">되돌리는 명령어</span>
          <Command text={call.undoCommand} undo />
        </div>
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
    </li>
  );
}

function Command({ text, undo }: { text: string; undo?: boolean }) {
  return (
    <pre className={undo ? "command command-undo" : "command"} translate="no">
      <code>{text}</code>
    </pre>
  );
}

function LevelSteps({ level }: { level: ServerLevel }) {
  return (
    <div className="consult-section">
      <h3 id="level-heading">서버 상태</h3>
      <ol className="level-steps" aria-labelledby="level-heading">
        {SERVER_LEVELS.map((step, index) => (
          <li key={step.value} data-level={step.value} aria-current={step.value === level ? "step" : undefined}>
            <span>{index + 1}단계</span> {step.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
