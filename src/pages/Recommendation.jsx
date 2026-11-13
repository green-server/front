import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Panel } from "@/components/Panel";
import { Krw } from "@/components/Power";
import { Session, useConsultation } from "@/components/Session";
import { Failure, Loading } from "@/components/Status";
import { api, useApi, useSubmit } from "@/lib/api";
import { MODELS, recommendationPlan, recommendationTypeLabel, SOURCE_LABEL } from "@/lib/format";
import styled from "styled-components";
import { AskActions, ConsultList, ConsultSummary } from "@/styles";

const PERMISSIONS = [
  { label: "읽기 명령", rule: "상태 확인은 묻지 않고 실행합니다." },
  { label: "일반 조치", rule: "묻지 않고 실행하며, 되돌리는 명령을 함께 기록합니다." },
  { label: "관리자 권한", rule: "실행 전에 화면에서 허용을 눌러야 합니다." },
  { label: "금지 명령", rule: "삭제나 방화벽 변경 같은 위험한 명령은 차단합니다." },
];

export default function RecommendationPage() {
  const { id, recommendationId } = useParams();
  const navigate = useNavigate();
  const { data, error, reload } = useApi(`/api/servers/${id}/recommendations`);
  const history = useApi(`/api/servers/${id}/consultations`);
  const servers = useApi("/api/servers");
  const back = { to: `/servers/${id}`, label: servers.data?.find((s) => s.id === Number(id))?.name ?? "서버" };
  const { busy, error: startError, run } = useSubmit();
  // In the URL, so a reload or a way back still shows the plan the owner was reading.
  const planId = Number(useSearchParams()[0].get("plan")) || null;

  if (error) return <Panel title="추천" back={back}><Failure error={error} retry={reload} /></Panel>;
  if (!data) return <Panel title="추천" back={back}><Loading /></Panel>;

  const item = data.find((entry) => entry.id === Number(recommendationId));
  if (!item) return <Panel title="추천" back={back}><p className="muted">이 추천을 찾을 수 없습니다.</p></Panel>;

  const execute = (planConsultationId) =>
    run(async () => {
      const created = await api(`/api/recommendations/${item.id}/execute`, {
        method: "POST",
        body: planConsultationId ? { planConsultationId } : undefined,
      });
      navigate(`/consultations/${created.id}`);
    });
  const makePlan = () =>
    run(async () => {
      const created = await api(`/api/recommendations/${item.id}/plan`, { method: "POST" });
      navigate(`?plan=${created.id}`, { replace: true });
    });

  const latest = history.data?.toSorted((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt))[0];
  const model = MODELS.find((option) => option.value === latest?.model)?.label ?? MODELS[0].label;
  const title = recommendationTypeLabel(item.type);

  return (
    <Panel title={title} back={back}>
      <title>{`${title} · Green Server`}</title>
      {item.estSavingKrw > 0 && (
        <Saving>
          <span className="muted">예상 절약</span>
          <Krw value={item.estSavingKrw} />
        </Saving>
      )}

      <section aria-labelledby="why-heading" className="section">
        <h2 id="why-heading">{SOURCE_LABEL[item.source]} 추천 내용</h2>
        <p>{item.detail}</p>
      </section>

      {planId ? (
        <AiPlan key={planId} id={planId} open={item.status === "open"} busy={busy} onExecute={execute} onRetry={makePlan} />
      ) : (
        <section aria-labelledby="steps-heading" className="section">
          <h2 id="steps-heading">적용 순서</h2>
          <ConsultList as="ol">
            {recommendationPlan(item.type).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ConsultList>
          <p className="muted">일반적인 순서입니다. {model}가 서버 상태를 본 뒤 실제 명령을 정합니다.</p>
          {item.status === "open" && (
            <PlanMake>
              <button type="button" className="btn" onClick={makePlan} disabled={busy}>
                계획 세우기
              </button>
              <span className="muted">AI가 이 서버를 읽기만 하고 실제 계획을 씁니다. 토큰을 사용합니다.</span>
            </PlanMake>
          )}
        </section>
      )}

      <section aria-labelledby="rules-heading" className="section">
        <h2 id="rules-heading">실행 권한</h2>
        <Rules className="rows">
          {PERMISSIONS.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.rule}</dd>
            </div>
          ))}
        </Rules>
      </section>

      {startError && (
        <p className="error" role="alert">
          {startError}
        </p>
      )}
      {!planId &&
        (item.status === "open" ? (
          <AskActions>
            <button type="button" className="btn btn-go" onClick={() => execute()} disabled={busy}>
              적용해주세요
            </button>
            <Link to={back.to} className="btn btn-quiet">
              취소
            </Link>
          </AskActions>
        ) : (
          <p className="muted">이미 처리한 추천입니다.</p>
        ))}
    </Panel>
  );
}

function AiPlan({
  id,
  open,
  busy,
  onExecute,
  onRetry,
}) {
  const { data, error, reload } = useConsultation(id);

  if (error) return <Failure error={error} retry={reload} />;
  if (!data) return <Loading />;

  const running = data.status === "requested" || data.status === "running";
  const done = data.status === "done";

  return (
    <PlanAi>
      <section aria-labelledby="steps-heading" className="section">
        <h2 id="steps-heading">이 서버의 적용 계획</h2>
        <div role="status">
          {running && <p className="muted">서버를 읽고 계획을 쓰는 중입니다. 아무것도 바꾸지 않습니다.</p>}
          {data.status === "failed" && <p className="error">계획을 세우지 못했습니다. {data.summary}</p>}
        </div>
        {done && data.summary && <ConsultSummary>{data.summary}</ConsultSummary>}
        {done && data.feedback.length > 0 && (
          <div className="section">
            <h3>확인한 내용</h3>
            <ConsultList>
              {data.feedback.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ConsultList>
          </div>
        )}
        {done && data.fixes.length > 0 && (
          <div className="section">
            <h3>적용 순서</h3>
            <ConsultList as="ol">
              {data.fixes.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ConsultList>
          </div>
        )}
        {done && open && (
          <AskActions>
            <button type="button" className="btn btn-go" onClick={() => onExecute(id)} disabled={busy}>
              이 계획대로 적용해주세요
            </button>
          </AskActions>
        )}
        {data.status === "failed" && open && (
          <AskActions>
            <button type="button" className="btn" onClick={onRetry} disabled={busy}>
              다시 세우기
            </button>
          </AskActions>
        )}
      </section>
      {data.stream.length > 0 || running ? <Session entries={data.stream} active={running} /> : null}
    </PlanAi>
  );
}

const Saving = styled.p`
  display: flex;
  align-items: baseline;
  gap: 2ch;
  margin: 0;
  font-weight: 700;

  & .muted {
    font-weight: 400;
  }
`;

const PlanMake = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5lh 2ch;
  margin-top: 1lh;
`;

const Rules = styled.dl`
  margin: 0;

  & dt {
    font-weight: 700;
  }
  & dd {
    margin: 0;
    color: var(--ink-2);
  }
`;

const PlanAi = styled.div`
  display: grid;
  min-width: 0;
`;
