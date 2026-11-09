import { Logo } from "@/components/Logo";

export default function RouteError() {
  return (
    <main className="auth">
      <title>오류 · Green Server</title>
      <Logo className="auth-logo" />
      <h1>화면을 표시하지 못했습니다</h1>
      <button type="button" className="button" onClick={() => location.reload()}>
        다시 시도
      </button>
    </main>
  );
}
