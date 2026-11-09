import { Link } from "react-router";
import "@/styles/auth.css";

export default function NotFound() {
  return (
    <main className="notice-card">
      <title>찾을 수 없음 · Green Server</title>
      <h1>페이지를 찾을 수 없습니다</h1>
      <Link to="/" className="btn">
        홈으로
      </Link>
    </main>
  );
}
