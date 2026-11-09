import { Panel } from "@/components/Panel";
import { Link } from "react-router";
import { useState, type FormEvent } from "react";
import { API_URL, api, useSubmit } from "@/lib/api";
import { KIND_LABEL, RATE_PLAN_LABEL } from "@/lib/format";
import "@/styles/server.css";
import type { Server, ServerInput } from "@/lib/types";

type Created = { server: Server; agentToken: string };

export default function NewServerPage() {
  const [ratePlan, setRatePlan] = useState<ServerInput["ratePlan"]>("home_tiered");
  const [created, setCreated] = useState<Created | null>(null);
  const { busy, error, run } = useSubmit();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const household = form.get("householdKwh") as string | null;
    const body: ServerInput = {
      name: form.get("name") as string,
      kind: form.get("kind") as ServerInput["kind"],
      ratePlan,
      ...(ratePlan === "cloud_hourly" && { hourlyKrw: Number(form.get("hourlyKrw")) }),
      ...(ratePlan === "home_tiered" && household && { householdKwh: Number(household) }),
    };
    return run(async () => setCreated(await api<Created>("/api/servers", { method: "POST", body })));
  };

  if (created) return <AgentToken {...created} />;

  return (
    <Panel title="서버 추가" back={{ to: "/servers", label: "서버" }}>
      <title>서버 추가 · Green Server</title>
      <form className="form" onSubmit={submit}>
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
          <select name="ratePlan" value={ratePlan} onChange={(e) => setRatePlan(e.target.value as ServerInput["ratePlan"])}>
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
      </form>
      <section className="section">
        <h2>등록한 다음에는</h2>
        <ol className="steps">
          <li>설치 명령어가 나타납니다. 토큰은 이때 한 번만 보입니다.</li>
          <li>서버 터미널에서 명령어를 실행합니다.</li>
          <li>첫 측정값이 들어오면 서버 목록에 전력이 표시됩니다.</li>
        </ol>
      </section>
    </Panel>
  );
}

function AgentToken({ server, agentToken }: Created) {
  const agentUrl = `${API_URL.replace(/^http/, "ws")}/ws/agent`;
  // No token in the command: sudo would write it to the system log. The installer asks for it.
  const installCommand = `curl -fsSL https://raw.githubusercontent.com/green-server/server_app/main/install.sh | sudo bash -s -- --server ${agentUrl}`;

  return (
    <Panel title={`${server.name} 에이전트 설치`} escape={false}>
      <title>에이전트 설치 · Green Server</title>
      <div className="token">
        <p className="token-notice">
          <strong>다시 볼 수 없음.</strong> 이 토큰은 지금 한 번만 표시됩니다. 이 화면을 떠나기 전에 복사해 두세요.
        </p>
        <h2 className="section-title">에이전트 토큰</h2>
        <Copyable text={agentToken} />
        <h2 className="section-title">설치 명령어</h2>
        <p>서버 터미널에서 실행하고, 토큰을 물으면 위 토큰을 붙여 넣으세요. 설치가 중간에 실패해도 토큰은 그대로 쓸 수 있습니다.</p>
        <Copyable text={installCommand} />
        <Link to={`/servers/${server.id}`} className="btn btn-go">
          서버 화면으로 이동
        </Link>
      </div>
    </Panel>
  );
}

function Copyable({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  };

  return (
    <div className="copyable">
      <pre translate="no">
        <code>{text}</code>
      </pre>
      <button type="button" className="btn" onClick={copy}>
        {copied ? "복사됨" : "복사"}
      </button>
    </div>
  );
}
