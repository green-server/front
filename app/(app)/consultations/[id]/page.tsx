"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Failure, Loading } from "@/components/Status";
import { api, useApi, useSubmit } from "@/lib/api";
import { AUTH_MODE_LABEL, CONSULTATION_STATUS, formatDateTime, SERVER_LEVELS, TIER_LABEL, undoState, upsertById } from "@/lib/format";
import { useLive } from "@/lib/live";
import type { Consultation, ServerLevel, ToolCall } from "@/lib/types";

type Detail = Consultation & { toolCalls: ToolCall[] };

export default function ConsultationPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, reload, mutate } = useApi<Detail>(`/api/consultations/${id}`);

  const putCall = (call: ToolCall) => mutate((c) => ({ ...c, toolCalls: upsertById(c.toolCalls, call) }));

  useLive((event) => {
    if (event.type === "reconnected") reload();
    if (event.type === "consultation" && event.consultation.id === Number(id)) {
      mutate((c) => ({ ...c, ...event.consultation }));
    }
    if (event.type === "tool_call" && event.toolCall.consultationId === Number(id)) putCall(event.toolCall);
  });

  if (error) return <Failure error={error} retry={reload} />;
  if (!data) return <Loading />;

  const pending = data.toolCalls.filter((call) => call.decision === "pending");
  const log = data.toolCalls.filter((call) => call.decision !== "pending");

  return (
    <div className="console">
      <title>AI 컨설팅 · Green Server</title>
      <div className="page-head">
        <div>
          <p className="crumb">
            <Link href={`/servers/${data.serverId}`}>서버로 돌아가기</Link>
          </p>
          <h1>
            AI 컨설팅
            {(data.status === "requested" || data.status === "running") && <span className="cursor" aria-hidden="true" />}
          </h1>
        </div>
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
      </div>

      <div aria-live="polite">
        {pending.length > 0 && (
          <section aria-labelledby="pending-heading" className="pane pane-alert">
            <div className="pane-head">
              <h2 id="pending-heading">권한 요청</h2>
            </div>
            <p>10분 안에 결정하지 않으면 거부로 처리됩니다.</p>
            {pending.map((call) => (
              <PendingCall key={call.id} call={call} onChange={putCall} />
            ))}
          </section>
        )}
      </div>

      <div className="console-grid">
        {(data.level || data.summary || data.feedback.length > 0 || data.fixes.length > 0) && (
          <section aria-labelledby="report-heading" className="pane">
            <div className="pane-head">
              <h2 id="report-heading">진단</h2>
            </div>
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

        <section aria-labelledby="log-heading" className="pane">
          <div className="pane-head">
            <h2 id="log-heading">실행 기록</h2>
          </div>
          {log.length === 0 ? (
            <p className="status">아직 실행한 명령이 없습니다.</p>
          ) : (
            <ol className="tool-log">
              {log.map((call) => (
                <LogEntry key={call.id} call={call} calls={data.toolCalls} onChange={putCall} />
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function PendingCall({ call, onChange }: { call: ToolCall; onChange: (call: ToolCall) => void }) {
  const { busy, error, run } = useSubmit();

  const decide = (decision: "approved" | "denied") =>
    run(async () => onChange(await api<ToolCall>(`/api/tool-calls/${call.id}/decision`, { method: "POST", body: { decision } })));

  return (
    <article className="approval">
      <dl>
        <div>
          <dt>실행할 명령어</dt>
          <dd>
            <Command text={call.command} />
          </dd>
        </div>
        <div>
          <dt>권한 단계</dt>
          <dd>{TIER_LABEL[call.tier]}</dd>
        </div>
        <div>
          <dt>되돌리는 명령어</dt>
          <dd>{call.undoCommand ? <Command text={call.undoCommand} /> : "기록된 명령어가 없어 되돌릴 수 없습니다."}</dd>
        </div>
      </dl>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="approval-actions">
        <button type="button" className="button button-primary" disabled={busy} onClick={() => decide("approved")}>
          허용
        </button>
        <button type="button" className="button" disabled={busy} onClick={() => decide("denied")}>
          거부
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
    <li className="tool-entry">
      <Command text={call.command} />
      <p className="tool-state">
        {call.undoOf !== null && <span>되돌리기</span>}
        <span>{TIER_LABEL[call.tier]}</span>
        <span>{outcome(call)}</span>
      </p>
      {call.undoCommand && (
        <div className="tool-undo">
          <span className="caption">되돌리는 명령어</span>
          <Command text={call.undoCommand} />
        </div>
      )}
      {undo === "running" && <p className="caption">되돌리는 중</p>}
      {undo === "done" && <p className="caption">되돌림</p>}
      {undo === "failed" && <p className="error">되돌리지 못했습니다.</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {(undo === "ready" || undo === "failed") && (
        <button type="button" className="button" disabled={busy} onClick={requestUndo}>
          되돌리기
        </button>
      )}
    </li>
  );
}

function outcome(call: ToolCall) {
  if (call.decision === "denied") return "거부됨";
  if (call.decision === "blocked") return "차단됨";
  const decided = call.decision === "approved" ? "허용됨" : "자동 실행";
  if (call.exitCode === null) return `${decided}, 실행 중`;
  return `${decided}, 종료 코드 ${call.exitCode}`;
}

function Command({ text }: { text: string }) {
  return (
    <pre className="command">
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
