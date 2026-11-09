import "@/styles/auth.css";

export default function RouteError() {
  return (
    <main className="notice-card">
      <title>오류 · Green Server</title>
      <h1>화면을 표시하지 못했습니다</h1>
      <button type="button" className="btn" onClick={() => location.reload()}>
        다시 시도
      </button>
    </main>
  );
}
