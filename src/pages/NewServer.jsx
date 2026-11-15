import { Panel } from "@/components/Panel";
import { Link, useBlocker } from "react-router-dom";
import { useEffect, useState } from "react";
import { Failure, Loading } from "@/components/Status";
import { API_URL, api, useApi, useSubmit } from "@/lib/api";
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

const LEAVE_WARNING = "에이전트 토큰은 다시 볼 수 없습니다. 복사하지 않았다면 서버를 다시 등록해야 합니다. 이 화면을 떠날까요?";

function AgentToken({ server, agentToken }) {
  const agentUrl = `${API_URL.replace(/^http/, "ws")}/ws/agent`;
  const grantKey = useApi("/api/grant-public-key");
  // No token in the command: sudo would write it to the system log. The installer asks for it.
  // --grant-key and --server-id install the root helper; without them no approval can ever run.
  const installCommand =
    grantKey.data &&
    `curl -fsSL https://raw.githubusercontent.com/green-server/server_app/main/install.sh | sudo bash -s -- --server ${agentUrl} --grant-key ${grantKey.data.publicKey} --server-id ${server.id}`;

  // The token cannot be shown again, so leaving asks first; the button to the server page is the way out.
  const serverPath = `/servers/${server.id}`;
  const blocker = useBlocker(({ nextLocation }) => nextLocation.pathname !== serverPath);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm(LEAVE_WARNING)) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  useEffect(() => {
    const onUnload = (event) => event.preventDefault();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  return (
    <Panel title={`${server.name} 에이전트 설치`} escape={false}>
      <title>에이전트 설치 · Green Server</title>
      {/* data-keep: AppLayout's menu shortcuts stay off while this is on screen. */}
      <Token data-keep="">
        <TokenNotice>
          <strong>다시 볼 수 없음.</strong> 이 토큰은 지금 한 번만 표시됩니다. 이 화면을 떠나기 전에 복사해 두세요.
        </TokenNotice>
        <SectionTitle>에이전트 토큰</SectionTitle>
        <Copyable text={agentToken} />
        <SectionTitle>설치 명령어</SectionTitle>
        <p>서버 터미널에서 실행하고, 토큰을 물으면 위 토큰을 붙여 넣으세요. 설치가 중간에 실패해도 토큰은 그대로 쓸 수 있습니다.</p>
        {grantKey.error && <Failure error={grantKey.error} retry={grantKey.reload} />}
        {!grantKey.error && !installCommand && <Loading />}
        {installCommand && <Copyable text={installCommand} />}
        <Link to={serverPath} className="btn btn-go">
          서버 화면으로 이동
        </Link>
      </Token>
    </Panel>
  );
}

const COPY_LABEL = { copied: "복사됨", failed: "복사하지 못했습니다. 직접 선택해 복사하세요" };

function Copyable({ text }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    // A failure stays up: it tells the owner what to do instead.
    if (result !== "copied") return;
    const timer = setTimeout(() => setResult(null), 2000);
    return () => clearTimeout(timer);
  }, [result]);

  // The clipboard is missing outside a secure context and may refuse: then the text is selected by hand.
  const copy = () =>
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(text))
      .then(
        () => setResult("copied"),
        () => setResult("failed"),
      );

  return (
    <CopyBox>
      <pre translate="no">
        <code>{text}</code>
      </pre>
      <button type="button" className="btn" onClick={copy}>
        {COPY_LABEL[result] ?? "복사"}
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
