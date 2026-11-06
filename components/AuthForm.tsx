"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { api, useSubmit } from "@/lib/api";
import type { User } from "@/lib/types";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const { busy, error, run } = useSubmit();
  const signup = mode === "signup";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    return run(async () => {
      await api<User>(signup ? "/api/auth/signup" : "/api/auth/login", { method: "POST", body });
      // Same-origin only, so a crafted ?next= cannot send people elsewhere.
      const next = new URL(new URLSearchParams(location.search).get("next") ?? "/", location.origin);
      router.replace(next.origin === location.origin ? next.pathname + next.search : "/");
    });
  };

  return (
    <main className="auth">
      <title>{`${signup ? "회원가입" : "로그인"} · Green Server`}</title>
      <p className="wordmark">Green Server</p>
      <p className="auth-lede">내 서버가 쓰는 전기를 W와 ₩로 확인합니다.</p>
      <h1>{signup ? "회원가입" : "로그인"}</h1>
      <form className="form" onSubmit={submit}>
        <label className="field">
          이메일
          <input name="email" type="email" autoComplete="email" required autoFocus />
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
        <Link href={signup ? "/login" : "/signup"}>{signup ? "로그인" : "회원가입"}</Link>
      </p>
    </main>
  );
}
