"use client";

import { useEffect } from "react";

/** Hands the pointer position to the panel under it as --mx/--my; themes decide whether to light it. */
export function Spotlight() {
  useEffect(() => {
    let last: HTMLElement | null = null;
    const move = (event: PointerEvent) => {
      const panel = (event.target as Element | null)?.closest<HTMLElement>(".pane, .form-pane, .meter-row");
      if (!panel) return;
      if (last && last !== panel) last.style.removeProperty("--mx");
      last = panel;
      const box = panel.getBoundingClientRect();
      panel.style.setProperty("--mx", `${event.clientX - box.left}px`);
      panel.style.setProperty("--my", `${event.clientY - box.top}px`);
    };
    addEventListener("pointermove", move, { passive: true });
    return () => removeEventListener("pointermove", move);
  }, []);
  return null;
}
