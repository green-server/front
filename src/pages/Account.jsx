import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Power } from "@/components/Power";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Panel } from "@/components/Panel";
import { Failure, Loading, OnlineState } from "@/components/Status";
import styled from "styled-components";
import { Form } from "@/styles";
import { api, useApi, useSubmit, clearApiCache } from "@/lib/api";
import { formatDate, isServerEstimated } from "@/lib/format";

export default function AccountPage() {
  const { data: user, error, reload, mutate } = useApi("/api/me");
  const servers = useApi("/api/servers");

  return (
    <Panel title="계정">
      <title>계정 · Green Server</title>
      {error && <Failure error={error} retry={reload} />}
      {!error && !user && <Loading />}
      {user && (
        <>
          <ProfileLine>
            <strong>{user.name}</strong>{" "}
            <span className="muted">
              {user.email} · {formatDate(user.createdAt)} 가입
            </span>
          </ProfileLine>
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

function MyServers({ servers }) {
  return (
    <section aria-labelledby="servers-heading" className="section">
      <h2 id="servers-heading">내 서버</h2>
      <MyServerList className="rows">
        {servers.map((server) => (
          <li key={server.id}>
            <Link to={`/servers/${server.id}`}>
              <strong>{server.name}</strong>
              <OnlineState online={server.online} dot />
              <Power
                value={server.latestWatts}
                estimated={isServerEstimated(server)}
              />
            </Link>
          </li>
        ))}
      </MyServerList>
    </section>
  );
}

function NameForm({
  name,
  onSaved,
}) {
  const { busy, error, run } = useSubmit();
  const [saved, setSaved] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("name");
    setSaved(false);
    return run(async () => {
      onSaved(
        await api("/api/me", { method: "PATCH", body: { name: value } }),
      );
      setSaved(true);
    });
  };

  return (
    <Form onSubmit={submit}>
      <label className="field">
        이름
        <input name="name" defaultValue={name} autoComplete="name" required />
      </label>
      <Outcome error={error} done={saved && "이름을 변경했습니다."} />
      <button className="btn" disabled={busy}>
        이름 변경
      </button>
    </Form>
  );
}

function PasswordForm() {
  const { busy, error, run } = useSubmit();
  const [saved, setSaved] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const password = new FormData(form).get("password");
    setSaved(false);
    return run(async () => {
      await api("/api/me", { method: "PATCH", body: { password } });
      form.reset();
      setSaved(true);
    });
  };

  return (
    <Form onSubmit={submit}>
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
    </Form>
  );
}

function DeleteAccount() {
  const navigate = useNavigate();
  return (
    <ConfirmDelete
      id="delete-account"
      heading="계정 삭제"
      label="계정 삭제"
      warning="계정을 삭제하면 되돌릴 수 없습니다. 정말 삭제할까요?"
      onConfirm={async () => {
        await api("/api/me", { method: "DELETE" });
        clearApiCache();
        navigate("/login", { replace: true });
      }}
    />
  );
}

function Outcome({
  error,
  done,
}) {
  if (error) {
    return (
      <FormError role="alert">
        {error}
      </FormError>
    );
  }
  return done ? (
    <p className="muted" role="status">
      {done}
    </p>
  ) : null;
}

const ProfileLine = styled.p`
  margin: 0;
`;

const FormError = styled.p`
  margin: 0;
  color: var(--bad);
`;

const MyServerList = styled.ul`
  & a {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0 2ch;
    text-decoration: none;
  }
`;
