import { useState } from "react";
import { formatNumber } from "@/lib/format";
import { useLive, type LiveEvent } from "@/lib/live";
import type { Consultation, ServerSummary } from "@/lib/types";

const MAX_LINES = 10;
const clock = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const CONSULTATION: Record<Consultation["status"], string> = {
  requested: "AI 상담 요청",
  running: "AI 상담 중",
  done: "AI 상담 완료",
  failed: "AI 상담 실패",
};

type Line = { key: number; text: string };

/** One log line for a live event, or null for events not worth a line. */
function describe(event: LiveEvent, name: (id: number) => string): string | null {
  const now = clock.format(new Date());
  switch (event.type) {
    case "metric": {
      const { ts, watts, isEstimated } = event.metric;
      return `${clock.format(new Date(ts))} ${name(event.serverId)} ${formatNumber(watts)}W ${isEstimated ? "추정" : "실측"}`;
    }
    case "agent_status":
      return `${now} ${name(event.serverId)} ${event.online ? "연결됨" : "끊김"}`;
    case "consultation":
      return `${now} ${name(event.consultation.serverId)} ${CONSULTATION[event.consultation.status]}`;
    case "tool_call":
      return event.toolCall.decision === "pending" ? `${now} 명령 승인 대기 $ ${event.toolCall.command}` : null;
    default:
      return null;
  }
}

/**
 * The fleet's live events as a faint terminal log on the home view, newest at the bottom.
 * It starts empty and fills as readings arrive; every line is something that just happened.
 */
export function LiveLog({ servers }: { servers: ServerSummary[] }) {
  const [lines, setLines] = useState<Line[]>([]);

  useLive((event) => {
    const text = describe(event, (id) => servers.find((s) => s.id === id)?.name ?? `서버 ${id}`);
    if (!text) return;
    setLines((prev) => [...prev, { key: (prev.at(-1)?.key ?? 0) + 1, text }].slice(-MAX_LINES));
  });

  // The same readings are on the server pages; screen readers would only hear a stream.
  return (
    <ol className="live-log" aria-hidden="true">
      {lines.map((line) => (
        <li key={line.key}>{line.text}</li>
      ))}
    </ol>
  );
}
