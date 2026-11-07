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

const useTheme = () =>
  useSyncExternalStore(
    onChange,
    () => document.documentElement.dataset.theme ?? "console",
    () => "console",
  );

export function ThemePicker({ className }: { className?: string }) {
  const theme = useTheme();

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

/** The same choice as the bar's picker, shown as small previews of each world. */
export function ThemeTiles() {
  const theme = useTheme();

  return (
    <div className="theme-tiles" role="radiogroup" aria-label="화면 테마">
      {THEMES.map((option) => (
        <label key={option.value} className="theme-tile" data-preview={option.value}>
          <input
            type="radio"
            name="theme"
            value={option.value}
            checked={theme === option.value}
            onChange={(event) => switchTheme(option.value, event.target)}
          />
          <svg viewBox="0 0 120 56" preserveAspectRatio="none" aria-hidden="true">
            <polyline points="0,46 22,44 34,45 42,14 54,12 62,44 84,43 92,30 100,44 120,42" />
          </svg>
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
