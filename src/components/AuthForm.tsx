import { Link } from "react-router";
import { useNavigate } from "react-router";
import type { FormEvent } from "react";
import { api, clearApiCache, useSubmit } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { PlanetView } from "@/components/PlanetView";
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
    <main className="auth-layout">
      <title>{`${signup ? "회원가입" : "로그인"} · Green Server`}</title>
      <aside className="auth-intro">
        <Logo className="auth-mark" />
        <h2>서버의 전력과 비용을<br />한눈에.</h2>
        <p>사용량을 확인하고, 낭비를 줄이는 방법을 찾아보세요.</p>
        <PlanetView />
      </aside>
      <div className="auth-card">
        <h1>{signup ? "계정 만들기" : "다시 만나 반가워요"}</h1>
        <p className="muted">{signup ? "계정을 만들고 첫 서버를 연결하세요." : "로그인하고 서버 상태를 확인하세요."}</p>
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
