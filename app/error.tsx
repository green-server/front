"use client";

export default function RouteError({ reset }: { reset: () => void }) {
  return (
    <main className="auth">
      <title>오류 · Green Server</title>
      <h1>화면을 표시하지 못했습니다</h1>
      <button type="button" className="button" onClick={reset}>
        다시 시도
      </button>
    </main>
  );
}
