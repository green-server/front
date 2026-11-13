import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { api, clearApiCache, useSubmit } from "@/lib/api";
import { setOrbit } from "@/lib/orbit";
import styled from "styled-components";
import { card } from "@/styles";

export function AuthForm({ mode }) {
  const navigate = useNavigate();
  const { busy, error, run } = useSubmit();
  const signup = mode === "signup";

  useEffect(() => {
    setOrbit({ auth: true });
    return () => setOrbit({ auth: false });
  }, []);

  const submit = (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    return run(async () => {
      await api(signup ? "/api/auth/signup" : "/api/auth/login", {
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
      <Card>
        <h1 className="sr-only">{signup ? "회원가입" : "로그인"}</h1>
        <AuthFields onSubmit={submit}>
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
          {error && <AuthError role="alert">{error}</AuthError>}
          <button className="btn btn-go" disabled={busy}>
            {signup ? "회원가입" : "로그인"}
          </button>
        </AuthFields>
        <Switch>
          {signup ? "이미 계정이 있다면 " : "계정이 없다면 "}
          <Link to={signup ? "/login" : "/signup"}>
            {signup ? "로그인" : "회원가입"}
          </Link>
        </Switch>
      </Card>
    </main>
  );
}

const Card = styled.div`
  ${card}
  top: 50%;
  /* Centred in the right half; the planet centres in the left. */
  left: 75%;
  width: 44ch;
  transform: translate(-50%, -50%);

  @media (max-width: 759.98px) {
    /* In flow below the planet, so the page scrolls when the keyboard opens. */
    position: relative;
    inset: auto;
    width: auto;
    margin: 52vh 1ch 1lh;
    transform: none;
  }
`;

const AuthFields = styled.form`
  display: grid;
  gap: 1lh;

  & .btn {
    justify-self: start;
  }
`;

const AuthError = styled.p`
  margin: 0;
  color: var(--bad);
`;

const Switch = styled.p`
  ${Card} & {
    margin: 0;
    color: var(--ink-2);
  }

  & a {
    color: var(--ink);
  }
`;
