export function Loading() {
  return (
    <div className="skeleton" role="status">
      <p className="muted">불러오는 중…</p>
      <span aria-hidden="true">░░░░░░░░░░░░░░░░░░░░░░░░</span>
      <span aria-hidden="true">░░░░░░░░░░░░░░░░</span>
    </div>
  );
}

export function Failure({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="failure" role="alert">
      <p>{error.message}</p>
      <button type="button" className="btn" onClick={retry}>
        다시 시도
      </button>
    </div>
  );
}

/** ● 연결됨 / ○ 끊김; `dot` keeps only the mark on screen, the word stays for screen readers and hover. */
export function OnlineState({ online, dot = false }: { online: boolean; dot?: boolean }) {
  const word = online ? "연결됨" : "끊김";
  return (
    <span className={online ? "online-state is-online" : "online-state"} title={dot ? word : undefined}>
      <span aria-hidden="true">{online ? "●" : "○"}</span>
      {dot ? <span className="sr-only">{word}</span> : ` ${word}`}
    </span>
  );
}
