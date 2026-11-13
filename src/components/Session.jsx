import { useEffect, useRef } from "react";
import styled from "styled-components";
import { useApi } from "@/lib/api";
import { appendStream, upsertById } from "@/lib/format";
import { useLive } from "@/lib/live";

/** One consultation, kept current by the live socket. */
export function useConsultation(id) {
  const { data, error, reload, mutate } = useApi(`/api/consultations/${id}`);

  const putCall = (call) => mutate((c) => ({ ...c, toolCalls: upsertById(c.toolCalls, call) }));

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

/** A mono log that stays on the newest line unless scrolled up. */
export function Session({ entries, active }) {
  const box = useRef(null);
  const following = useRef(true);

  useEffect(() => {
    if (following.current) box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [entries.length]);

  const onScroll = () => {
    const el = box.current;
    following.current = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
  };

  return (
    <section aria-labelledby="session-heading" className="section">
      <h2 id="session-heading">실시간 진행</h2>
      {/* Not a live region: a screen reader would read every line of output aloud. */}
      <Log ref={box} tabIndex={0} role="group" aria-labelledby="session-heading" onScroll={onScroll}>
        {entries.map((entry) => (
          <pre key={entry.seq} className={`session-${entry.kind}`} translate="no">
            {entry.text}
          </pre>
        ))}
        {active && entries.length === 0 && <Wait>서버에서 시작하는 중…</Wait>}
      </Log>
    </section>
  );
}

/* The agent's live session, like a terminal pane. */
const Log = styled.div`
  display: grid;
  align-content: start;
  min-height: 6lh;
  max-height: 16lh;
  overflow-y: auto;
  padding: 1lh 2ch;
  /* An outline, not a pseudo-element, so the frame stays put while the log scrolls. */
  outline: 1px solid var(--line);
  outline-offset: -0.5lh;

  /* Keyboard focus shows the global :focus-visible ring instead, as it did when that rule won by
     coming later in the stylesheet. */
  &:focus-visible {
    outline: 1px solid var(--go);
    outline-offset: 2px;
  }

  & pre {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  & .session-text {
    color: var(--ink);
  }
  & .session-command {
    color: var(--go);
    font-weight: 700;
  }
  & .session-output {
    color: var(--ink-2);
  }
`;

const Wait = styled.p`
  margin: 0;
  color: var(--ink-2);
`;
