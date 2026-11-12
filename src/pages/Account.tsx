import { Link } from "react-router";
import { useNavigate } from "react-router";
import { useRef, useState, type FormEvent } from "react";
import { Power } from "@/components/Power";
import { Panel } from "@/components/Panel";
import { Failure, Loading, OnlineState } from "@/components/Status";
import "@/styles/reports.css";
import { api, useApi, useSubmit, clearApiCache } from "@/lib/api";
import { formatDate, isServerEstimated } from "@/lib/format";
import type { ServerSummary, User } from "@/lib/types";

export default function AccountPage() {
  const { data: user, error, reload, mutate } = useApi<User>("/api/me");
  const servers = useApi<ServerSummary[]>("/api/servers");

  return (
    <Panel title="계정">
      <title>계정 · Green Server</title>
      {error && <Failure error={error} retry={reload} />}
      {!error && !user && <Loading />}
      {user && (
        <>
          <p className="profile-line">
            <strong>{user.name}</strong>{" "}
            <span className="muted">
              {user.email} · {formatDate(user.createdAt)} 가입
            </span>
          </p>
          <section className="section" aria-labelledby="profile-heading">
            <h2 id="profile-heading">이름</h2>
            <NameForm name={user.name} onSaved={(next) => mutate(() => next)} />
          </section>
          <section className="section" aria-labelledby="password-heading">
            <h2 id="password-heading">비밀번호</h2>
            <PasswordForm />
          </section>
          {servers.data && servers.data.length > 0 && (
            <MyServers servers={servers.data} />
          )}
          <DeleteAccount />
        </>
      )}
    </Panel>
  );
}

function MyServers({ servers }: { servers: ServerSummary[] }) {
  return (
    <section aria-labelledby="servers-heading" className="section">
      <h2 id="servers-heading">내 서버</h2>
      <ul className="rows account-servers">
        {servers.map((server) => (
          <li key={server.id}>
            <Link to={`/servers/${server.id}`}>
              <strong>{server.name}</strong>
              <OnlineState online={server.online} />
              <Power
                value={server.latestWatts}
                estimated={isServerEstimated(server)}
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NameForm({
  name,
  onSaved,
}: {
  name: string;
  onSaved: (user: User) => void;
}) {
  const { busy, error, run } = useSubmit();
  const [saved, setSaved] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("name");
    setSaved(false);
    return run(async () => {
      onSaved(
        await api<User>("/api/me", { method: "PATCH", body: { name: value } }),
      );
      setSaved(true);
    });
  };

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        이름
        <input name="name" defaultValue={name} autoComplete="name" required />
      </label>
      <Outcome error={error} done={saved && "이름을 변경했습니다."} />
      <button className="btn" disabled={busy}>
        이름 변경
      </button>
    </form>
  );
}

function PasswordForm() {
  const { busy, error, run } = useSubmit();
  const [saved, setSaved] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const password = new FormData(form).get("password");
    setSaved(false);
    return run(async () => {
      await api<User>("/api/me", { method: "PATCH", body: { password } });
      form.reset();
      setSaved(true);
    });
  };

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        새 비밀번호
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </label>
      <Outcome error={error} done={saved && "비밀번호를 변경했습니다."} />
      <button className="btn" disabled={busy}>
        비밀번호 변경
      </button>
    </form>
  );
}

function DeleteAccount() {
  const navigate = useNavigate();
  const { busy, error, run } = useSubmit();
  const [confirming, setConfirming] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);

  const remove = () =>
    run(async () => {
      await api("/api/me", { method: "DELETE" });
      clearApiCache();
      navigate("/login", { replace: true });
    });

  const cancel = () => {
    setConfirming(false);
    requestAnimationFrame(() => opener.current?.focus());
  };

  return (
    <section aria-labelledby="delete-heading" className="section">
      <h2 id="delete-heading">계정 삭제</h2>
      {!confirming ? (
        <button
          ref={opener}
          type="button"
          className="btn btn-danger"
          onClick={() => setConfirming(true)}
        >
          계정 삭제
        </button>
      ) : (
        <div role="group" aria-label="계정 삭제 확인">
          <p>계정을 삭제하면 되돌릴 수 없습니다. 정말 삭제할까요?</p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="confirm-actions">
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy}
              onClick={remove}
              autoFocus
            >
              계정 삭제
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={cancel}
            >
              취소
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Outcome({
  error,
  done,
}: {
  error: string | null;
  done: string | false;
}) {
  if (error) {
    return (
      <p className="form-error" role="alert">
        {error}
      </p>
    );
  }
  return done ? (
    <p className="muted" role="status">
      {done}
    </p>
  ) : null;
}
