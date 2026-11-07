import type { ReactNode } from "react";

// A template remounts on navigation, which is what replays the entrance.
export default function RouteTemplate({ children }: { children: ReactNode }) {
  return <div className="route">{children}</div>;
}
