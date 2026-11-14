import { useRef, useState } from "react";
import styled from "styled-components";
import { useSubmit } from "@/lib/api";

/**
 * A delete that asks once before it runs: [ 삭제 ] opens a short warning with the real button and
 * [ 취소 ]; cancelling puts focus back on the opener. `onConfirm` does the delete and moves on.
 */
export function ConfirmDelete({ id, heading, label, warning, onConfirm }) {
  const { busy, error, run } = useSubmit();
  const [confirming, setConfirming] = useState(false);
  const opener = useRef(null);

  const cancel = () => {
    setConfirming(false);
    requestAnimationFrame(() => opener.current?.focus());
  };

  return (
    <section aria-labelledby={`${id}-heading`} className="section">
      <h2 id={`${id}-heading`}>{heading}</h2>
      {!confirming ? (
        <Opener ref={opener} type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
          {label}
        </Opener>
      ) : (
        <div role="group" aria-label={`${label} 확인`}>
          <p>{warning}</p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Actions>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => run(onConfirm)} autoFocus>
              {label}
            </button>
            <button type="button" className="btn" disabled={busy} onClick={cancel}>
              취소
            </button>
          </Actions>
        </div>
      )}
    </section>
  );
}

// A section is a grid: without this the lone button stretches across it and its label sits in the middle.
const Opener = styled.button`
  justify-self: start;
`;

const Actions = styled.div`
  display: flex;
  gap: 2ch;
`;
