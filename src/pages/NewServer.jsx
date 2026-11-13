import { Panel } from "@/components/Panel";
import { Link } from "react-router-dom";
import { useState } from "react";
import { API_URL, api, useSubmit } from "@/lib/api";
import { KIND_LABEL, RATE_PLAN_LABEL } from "@/lib/format";
import styled from "styled-components";
import { Form } from "@/styles";

export default function NewServerPage() {
  const [ratePlan, setRatePlan] = useState("home_tiered");
  const [created, setCreated] = useState(null);
  const { busy, error, run } = useSubmit();

  const submit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const household = form.get("householdKwh");
    const body = {
      name: form.get("name"),
      kind: form.get("kind"),
      ratePlan,
      ...(ratePlan === "cloud_hourly" && { hourlyKrw: Number(form.get("hourlyKrw")) }),
      ...(ratePlan === "home_tiered" && household && { householdKwh: Number(household) }),
    };
    return run(async () => setCreated(await api("/api/servers", { method: "POST", body })));
  };

  if (created) return <AgentToken {...created} />;

  return (
    <Panel title="서버 추가" back={{ to: "/servers", label: "서버" }}>
      <title>서버 추가 · Green Server</title>
      <Form onSubmit={submit}>
        <label className="field">
          서버 이름
          <input name="name" required autoFocus />
        </label>
        <label className="field">
          서버 종류
          <select name="kind" defaultValue="home_pc">
            {Object.entries(KIND_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          요금제
          <select name="ratePlan" value={ratePlan} onChange={(e) => setRatePlan(e.target.value)}>
            {Object.entries(RATE_PLAN_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {ratePlan === "cloud_hourly" && (
          <label className="field">
            시간당 요금 (₩)
            <input name="hourlyKrw" type="number" min="0" step="any" inputMode="decimal" required />
          </label>
        )}
        {ratePlan === "home_tiered" && (
          <label className="field">
            이 서버를 뺀 가구 월 사용량 (kWh)
            <input name="householdKwh" type="number" min="0" step="any" inputMode="decimal" />
          </label>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-go" disabled={busy}>
          서버 추가
        </button>
      </Form>
      <section className="section">
        <h2>등록한 다음에는</h2>
        <Steps>
          <li>설치 명령어가 나타납니다. 토큰은 이때 한 번만 보입니다.</li>
          <li>서버 터미널에서 명령어를 실행합니다.</li>
          <li>첫 측정값이 들어오면 서버 목록에 전력이 표시됩니다.</li>
        </Steps>
      </section>
    </Panel>
  );
}

function AgentToken({ server, agentToken }) {
  const agentUrl = `${API_URL.replace(/^http/, "ws")}/ws/agent`;
  // No token in the command: sudo would write it to the system log. The installer asks for it.
  const installCommand = `curl -fsSL https://raw.githubusercontent.com/green-server/server_app/main/install.sh | sudo bash -s -- --server ${agentUrl}`;

  return (
    <Panel title={`${server.name} 에이전트 설치`} escape={false}>
      <title>에이전트 설치 · Green Server</title>
      <Token>
        <TokenNotice>
          <strong>다시 볼 수 없음.</strong> 이 토큰은 지금 한 번만 표시됩니다. 이 화면을 떠나기 전에 복사해 두세요.
        </TokenNotice>
        <SectionTitle>에이전트 토큰</SectionTitle>
        <Copyable text={agentToken} />
        <SectionTitle>설치 명령어</SectionTitle>
        <p>서버 터미널에서 실행하고, 토큰을 물으면 위 토큰을 붙여 넣으세요. 설치가 중간에 실패해도 토큰은 그대로 쓸 수 있습니다.</p>
        <Copyable text={installCommand} />
        <Link to={`/servers/${server.id}`} className="btn btn-go">
          서버 화면으로 이동
        </Link>
      </Token>
    </Panel>
  );
}

function Copyable({ text }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  };

  return (
    <CopyBox>
      <pre translate="no">
        <code>{text}</code>
      </pre>
      <button type="button" className="btn" onClick={copy}>
        {copied ? "복사됨" : "복사"}
      </button>
    </CopyBox>
  );
}

const Steps = styled.ol`
  .panel & {
    list-style: decimal;
    margin: 0;
    padding-left: 3ch;
    color: var(--ink-2);
  }
`;

const SectionTitle = styled.h2`
  .panel & {
    margin-top: 1lh;
  }
`;

const Token = styled.div`
  .panel & {
    display: grid;
    gap: 0.5lh;
  }
  .panel & p {
    margin: 0;
  }
`;

const TokenNotice = styled.p`
  color: var(--warn);
`;

const CopyBox = styled.div`
  .panel & {
    display: grid;
    gap: 0.5lh;
    justify-items: start;
  }
  .panel & pre {
    position: relative;
    width: 100%;
    margin: 0;
    padding: 1lh 2ch;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .panel & pre::before {
    content: "";
    position: absolute;
    inset: 0.5lh 0.5ch;
    border: 1px solid var(--line);
    pointer-events: none;
  }
`;
