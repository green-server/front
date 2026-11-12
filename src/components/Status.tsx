export function Loading() {
  return (
    <div className="skeleton" role="status">
      <p className="muted">불러오는 중…</p>
      <span className="skeleton-line" aria-hidden="true" />
      <span className="skeleton-line" aria-hidden="true" />
      <span className="skeleton-line" aria-hidden="true" />
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

export function OnlineState({ online }: { online: boolean }) {
  return (
    <span className={online ? "online-state is-online" : "online-state"}>
      <span className="dot" aria-hidden="true" />
      {online ? "연결됨" : "끊김"}
    </span>
  );
}
