import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth">
      <title>찾을 수 없음 · Green Server</title>
      <h1>페이지를 찾을 수 없습니다</h1>
      <p>
        <Link href="/">서버 목록으로 돌아가기</Link>
      </p>
    </main>
  );
}
