import { Link } from "react-router";
import { useNavigate } from "react-router";
import type { FormEvent } from "react";
import { Logo } from "@/components/Logo";
import { api, clearApiCache, useSubmit } from "@/lib/api";
import type { User } from "@/lib/types";

// Idle, a load spike, idle again: the shape every server here draws.
const GATE_TRACE = "0,62 120,62 150,60 170,63 200,61 230,62 262,62 268,18 276,14 300,16 330,12 362,15 372,58 400,61 470,60 520,62 560,61 566,40 574,44 582,61 660,62 720,60 800,62";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const { busy, error, run } = useSubmit();
  const signup = mode === "signup";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    return run(async () => {
      await api<User>(signup ? "/api/auth/signup" : "/api/auth/login", { method: "POST", body });
      clearApiCache();
      // Same-origin only, so a crafted ?next= cannot send people elsewhere.
      const next = new URL(new URLSearchParams(location.search).get("next") ?? "/", location.origin);
      navigate(next.origin === location.origin ? next.pathname + next.search : "/", { replace: true });
    });
  };

  return (
    <main className="gate">
      <title>{`${signup ? "회원가입" : "로그인"} · Green Server`}</title>
      <div className="gate-mark">
        <Logo className="gate-logo" />
        <p className="gate-lede">내 서버가 쓰는 전기를 W와 ₩로 확인합니다.</p>
        <svg className="gate-trace" viewBox="0 0 800 80" preserveAspectRatio="none" aria-hidden="true">
          <polyline className="chart-line" points={GATE_TRACE} pathLength={1} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="gate-form">
      <h1>{signup ? "회원가입" : "로그인"}</h1>
      <form className="form" onSubmit={submit}>
        <label className="field">
          이메일
          <input name="email" type="email" autoComplete="email" spellCheck={false} required autoFocus />
        </label>
        {signup && (
          <label className="field">
            이름
            <input name="name" autoComplete="name" required />
          </label>
        )}
        <label className="field">
          비밀번호
          <input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button button-primary" disabled={busy}>
          {signup ? "회원가입" : "로그인"}
        </button>
      </form>
      <p className="auth-switch">
        {signup ? "이미 계정이 있다면 " : "계정이 없다면 "}
        <Link to={signup ? "/login" : "/signup"}>{signup ? "로그인" : "회원가입"}</Link>
      </p>
      </div>
    </main>
  );
}
