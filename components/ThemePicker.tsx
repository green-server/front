"use client";

import { useSyncExternalStore } from "react";
import { applyTheme, THEMES, type Theme } from "@/lib/theme";

const onChange = (notify: () => void) => {
  window.addEventListener("themechange", notify);
  return () => window.removeEventListener("themechange", notify);
};

export function ThemePicker({ className }: { className?: string }) {
  const theme = useSyncExternalStore(
    onChange,
    () => document.documentElement.dataset.theme ?? "console",
    () => "console",
  );

  return (
    <label className={className}>
      <span>테마</span>
      <select value={theme} onChange={(event) => applyTheme(event.target.value as Theme)}>
        {THEMES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
