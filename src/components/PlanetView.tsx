import { lazy, Suspense, type ReactNode } from "react";
import "@/styles/scene.css";

const Unavailable = () => <p className="scene-status">지구 보기를 사용할 수 없습니다.</p>;
// Keep the page usable while the optional 3D chunk loads or cannot be reached.
const OrbitScene = lazy(() => import("@/components/OrbitScene").catch(() => ({ default: Unavailable })));

export function PlanetView({ children }: { children?: ReactNode }) {
  return <div className="orbit-view"><Suspense fallback={<p className="scene-status">지구 불러오는 중…</p>}><OrbitScene /></Suspense>{children}</div>;
}
