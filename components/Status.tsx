export function Loading() {
  return (
    <p className="status" role="status">
      불러오는 중<span className="cursor" aria-hidden="true" />
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
    <span className={online ? "online-state is-online" : "online-state"}>
      <span className="dot" aria-hidden="true" />
      {online ? "연결됨" : "끊김"}
    </span>
  );
}
