"use client";

import { useSyncExternalStore } from "react";
import { applyTheme, THEMES, type Theme } from "@/lib/theme";

const onChange = (notify: () => void) => {
  window.addEventListener("themechange", notify);
  return () => window.removeEventListener("themechange", notify);
};

/** The new theme spreads from the picker, because that is where the change came from. */
function switchTheme(next: Theme, from: HTMLElement) {
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    applyTheme(next);
    return;
  }
  const box = from.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document.startViewTransition(() => applyTheme(next)).ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 620, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" },
    );
  });
}

export function ThemePicker({ className }: { className?: string }) {
  const theme = useSyncExternalStore(
    onChange,
    () => document.documentElement.dataset.theme ?? "console",
    () => "console",
  );

  return (
    <label className={className}>
      <span>테마</span>
      <select value={theme} onChange={(event) => switchTheme(event.target.value as Theme, event.target)}>
        {THEMES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
