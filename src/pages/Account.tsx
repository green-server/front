import { Link } from "react-router";
import { useNavigate } from "react-router";
import { useRef, useState, type FormEvent } from "react";
import { Power } from "@/components/Power";
import { Failure, Loading, OnlineState } from "@/components/Status";
import { api, useApi, useSubmit, clearApiCache } from "@/lib/api";
import { formatDate, formatKrw, isServerEstimated } from "@/lib/format";
import type { ActivityReport, ServerSummary, User } from "@/lib/types";

export default function AccountPage() {
  const { data: user, error, reload, mutate } = useApi<User>("/api/me");
  const servers = useApi<ServerSummary[]>("/api/servers");
  const activity = useApi<ActivityReport>("/api/reports/activity");

  return (
    <>
      <title>계정 · Green Server</title>
      <div className="page-head">
        <h1>계정</h1>
      </div>
      {error && <Failure error={error} retry={reload} />}
      {!error && !user && <Loading />}
      {user && (
        <div className="account">
          <Profile user={user} servers={servers.data} activity={activity.data} />
          <section aria-labelledby="profile-heading" className="pane account-pane">
            <div className="pane-head">
              <h2 id="profile-heading">프로필</h2>
            </div>
            <NameForm name={user.name} onSaved={(next) => mutate(() => next)} />
          </section>
          <section aria-labelledby="password-heading" className="pane">
            <div className="pane-head">
              <h2 id="password-heading">비밀번호</h2>
            </div>
            <PasswordForm />
          </section>
          {servers.data && servers.data.length > 0 && <MyServers servers={servers.data} />}
          <DeleteAccount />
        </div>
      )}
    </>
  );
}

function Profile({ user, servers, activity }: { user: User; servers?: ServerSummary[]; activity?: ActivityReport }) {
  const online = servers?.filter((server) => server.online).length ?? 0;
  const monthly = servers?.reduce((sum, server) => sum + server.monthlyKrw, 0) ?? 0;
  const open = activity?.servers.reduce((sum, row) => sum + row.open, 0) ?? 0;
  const applied = activity?.servers.reduce((sum, row) => sum + row.applied, 0) ?? 0;

  return (
    <header className="profile account-wide">
      <span className="profile-mark" aria-hidden="true">
        {[...user.name][0]}
      </span>
      <div className="profile-who">
        <p className="profile-name">{user.name}</p>
        <p className="caption">{user.email}</p>
        <p className="caption">{formatDate(user.createdAt)} 가입</p>
      </div>
      <dl className="profile-stats">
        <div>
          <dt>등록한 서버</dt>
          <dd className="figure">
            {servers?.length ?? "–"}대<span className="caption"> 연결 {online}대</span>
          </dd>
        </div>
        <div>
          <dt>이번 달 예상 요금</dt>
          <dd className="figure">{formatKrw(monthly)}</dd>
        </div>
        <div>
          <dt>대기 중인 추천</dt>
          <dd className="figure">{open}건</dd>
        </div>
        <div>
          <dt>적용한 조치</dt>
          <dd className="figure">{applied}건</dd>
        </div>
      </dl>
    </header>
  );
}

function MyServers({ servers }: { servers: ServerSummary[] }) {
  return (
    <section aria-labelledby="servers-heading" className="pane">
      <div className="pane-head">
        <h2 id="servers-heading">내 서버</h2>
      </div>
      <ul className="account-servers">
        {servers.map((server) => (
          <li key={server.id}>
            <Link to={`/servers/${server.id}`}>
              <strong>{server.name}</strong>
              <OnlineState online={server.online} />
              <Power value={server.latestWatts} estimated={isServerEstimated(server)} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NameForm({ name, onSaved }: { name: string; onSaved: (user: User) => void }) {
  const { busy, error, run } = useSubmit();
  const [saved, setSaved] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("name");
    setSaved(false);
    return run(async () => {
      onSaved(await api<User>("/api/me", { method: "PATCH", body: { name: value } }));
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
      <button className="button" disabled={busy}>
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
        <input name="password" type="password" autoComplete="new-password" required />
      </label>
      <Outcome error={error} done={saved && "비밀번호를 변경했습니다."} />
      <button className="button" disabled={busy}>
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
    <section aria-labelledby="delete-heading" className="pane danger-zone">
      <div className="pane-head">
        <h2 id="delete-heading">계정 삭제</h2>
      </div>
      {!confirming ? (
        <button ref={opener} type="button" className="button button-danger" onClick={() => setConfirming(true)}>
          계정 삭제
        </button>
      ) : (
        <div role="group" aria-label="계정 삭제 확인">
          <p>계정을 삭제하면 되돌릴 수 없습니다. 정말 삭제할까요?</p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="approval-actions">
            <button type="button" className="button button-danger" disabled={busy} onClick={remove} autoFocus>
              계정 삭제
            </button>
            <button type="button" className="button" disabled={busy} onClick={cancel}>
              취소
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Outcome({ error, done }: { error: string | null; done: string | false }) {
  if (error) {
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  }
  return done ? (
    <p className="caption" role="status">
      {done}
    </p>
  ) : null;
}
