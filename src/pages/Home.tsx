import { Link } from "react-router";
import { useServers } from "@/AppLayout";
import { Failure } from "@/components/Status";
import "@/styles/home.css";

/** Home is the planet alone; only a failed load or an empty fleet puts anything over it. */
export default function Home() {
  const { servers, error, reload } = useServers();

  if (error) {
    return (
      <div className="home-empty">
        <Failure error={error} retry={reload} />
      </div>
    );
  }
  if (servers?.length === 0) {
    return (
      <div className="home-empty">
        <Link to="/servers/new" className="btn btn-go">
          서버 연결하기
        </Link>
      </div>
    );
  }
  return null;
}
