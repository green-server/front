export function Loading() {
  return (
    <p className="status" role="status">
      불러오는 중
    </p>
  );
}

export function Failure({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="failure" role="alert">
      <p>{error.message}</p>
      <button type="button" className="button" onClick={retry}>
        다시 시도
      </button>
    </div>
  );
}

export function OnlineState({ online }: { online: boolean }) {
  return (
    <span className="online-state">
      <span className={online ? "dot dot-on" : "dot"} aria-hidden="true" />
      {online ? "연결됨" : "끊김"}
    </span>
  );
}
