import type { ServerSummary } from "./types";

/**
 * How green the planet is, 0 (parched) to 1 (lush): total draw now against the 7-day average.
 * At the average it is 0.5; a third below is fully green, a third above fully dry.
 * A server that is offline draws nothing now, the same as the savings report counts it.
 */
export function planetHealth(servers: ServerSummary[] | undefined): number {
  const tracked = servers?.filter((s) => s.weekWatts !== null && s.weekWatts > 0) ?? [];
  const week = tracked.reduce((sum, s) => sum + (s.weekWatts ?? 0), 0);
  if (week === 0) return 1;
  const now = tracked.reduce((sum, s) => sum + (s.online ? (s.latestWatts ?? 0) : 0), 0);
  return Math.min(1, Math.max(0, 0.5 + (1 - now / week) * 1.5));
}

// The planet reads this every frame, so a plain variable is enough.
let health = 1;
export const setPlanetHealth = (value: number) => void (health = value);
export const getPlanetHealth = () => health;
