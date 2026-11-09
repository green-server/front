import { Link } from "react-router";
import { useNavigate } from "react-router";
import type { FormEvent } from "react";
import { api, clearApiCache, useSubmit } from "@/lib/api";
import type { User } from "@/lib/types";
import "@/styles/auth.css";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const { busy, error, run } = useSubmit();
  const signup = mode === "signup";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    return run(async () => {
      await api<User>(signup ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        body,
      });
      clearApiCache();
      // Same-origin only, so a crafted ?next= cannot send people elsewhere.
      const next = new URL(
        new URLSearchParams(location.search).get("next") ?? "/",
        location.origin,
      );
      navigate(
        next.origin === location.origin ? next.pathname + next.search : "/",
        { replace: true },
      );
    });
  };

  return (
    <main>
      <title>{`${signup ? "회원가입" : "로그인"} · Green Server`}</title>
      <div className="auth-card">
        <h1 className="sr-only">{signup ? "회원가입" : "로그인"}</h1>
        <form className="auth-form" onSubmit={submit}>
          <label className="field">
            이메일
            <input
              name="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              required
              autoFocus
            />
          </label>
          {signup && (
            <label className="field">
              이름
              <input name="name" autoComplete="name" required />
            </label>
          )}
          <label className="field">
            비밀번호
            <input
              name="password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              required
            />
          </label>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-go" disabled={busy}>
            {signup ? "회원가입" : "로그인"}
          </button>
        </form>
        <p className="auth-switch">
          {signup ? "이미 계정이 있다면 " : "계정이 없다면 "}
          <Link to={signup ? "/login" : "/signup"}>
            {signup ? "로그인" : "회원가입"}
          </Link>
        </p>
      </div>
    </main>
  );
}
