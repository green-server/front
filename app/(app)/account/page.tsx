"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Failure, Loading } from "@/components/Status";
import { api, useApi, useSubmit } from "@/lib/api";
import type { User } from "@/lib/types";

export default function AccountPage() {
  const { data: user, error, reload, mutate } = useApi<User>("/api/me");

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
          <p className="caption">{user.email}</p>
          <NameForm name={user.name} onSaved={(next) => mutate(() => next)} />
          <PasswordForm />
          <DeleteAccount />
        </div>
      )}
    </>
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
  const router = useRouter();
  const { busy, error, run } = useSubmit();
  const [confirming, setConfirming] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);

  const remove = () =>
    run(async () => {
      await api("/api/me", { method: "DELETE" });
      router.replace("/login");
    });

  const cancel = () => {
    setConfirming(false);
    requestAnimationFrame(() => opener.current?.focus());
  };

  return (
    <section aria-labelledby="delete-heading" className="danger-zone">
      <h2 id="delete-heading">계정 삭제</h2>
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
