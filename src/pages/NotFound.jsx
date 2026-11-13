import { Link } from "react-router-dom";
import { NoticeCard } from "@/styles";

export default function NotFound() {
  return (
    <NoticeCard>
      <title>찾을 수 없음 · Green Server</title>
      <h1>페이지를 찾을 수 없습니다</h1>
      <Link to="/" className="btn">
        홈으로
      </Link>
    </NoticeCard>
  );
}
