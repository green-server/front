"use client";

import { useEffect, useRef } from "react";
import { useApi } from "@/lib/api";
import { appendStream, upsertById } from "@/lib/format";
import { useLive } from "@/lib/live";
import type { Consultation, StreamEntry, ToolCall } from "@/lib/types";

type Detail = Consultation & { toolCalls: ToolCall[]; stream: StreamEntry[] };

/** One consultation, kept current by the live socket. */
export function useConsultation(id: number) {
  const { data, error, reload, mutate } = useApi<Detail>(`/api/consultations/${id}`);

  const putCall = (call: ToolCall) => mutate((c) => ({ ...c, toolCalls: upsertById(c.toolCalls, call) }));

  useLive((event) => {
    if (event.type === "reconnected") reload();
    if (event.type === "consultation" && event.consultation.id === id) {
      mutate((c) => ({ ...c, ...event.consultation }));
    }
    if (event.type === "tool_call" && event.toolCall.consultationId === id) putCall(event.toolCall);
    if (event.type === "consultation_stream" && event.consultationId === id) {
      mutate((c) => ({ ...c, stream: appendStream(c.stream, event.entry) }));
    }
  });

  return { data, error, reload, putCall };
}

/** Reads like the terminal Claude is working in, and stays on the newest line unless scrolled up. */
export function Session({ entries, active }: { entries: StreamEntry[]; active: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const following = useRef(true);

  useEffect(() => {
    if (following.current) box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [entries.length]);

  const onScroll = () => {
    const el = box.current!;
    following.current = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
  };

  return (
    <section aria-labelledby="session-heading" className="pane session-pane">
      <div className="pane-head">
        <h2 id="session-heading">실시간 진행</h2>
      </div>
      {/* Not a live region: a screen reader would read every line of output aloud. */}
      <div ref={box} className="session" tabIndex={0} role="group" aria-labelledby="session-heading" onScroll={onScroll}>
        {entries.map((entry) => (
          <pre key={entry.seq} className={`session-${entry.kind}`}>
            {entry.text}
          </pre>
        ))}
        {active && (
          <p className="session-wait">
            {entries.length === 0 && "서버에서 시작하는 중"}
            <span className="cursor" aria-hidden="true" />
          </p>
        )}
      </div>
    </section>
  );
}
