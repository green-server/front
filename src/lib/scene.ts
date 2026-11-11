import type { Fruit } from "./tree";
import type { ActivityReport, ServerSummary } from "./types";

/**
 * How healthy the tree is, 0 (parched) to 1 (lush): total draw now against the 7-day average.
 * At the average it is 0.5; a third below is fully green, a third above fully dry.
 * A server that is offline draws nothing now, the same as the savings report counts it.
 */
export function planetHealth(servers: ServerSummary[] | undefined): number {
  const tracked = servers?.filter((s) => s.weekWatts !== null && s.weekWatts > 0) ?? [];
  const week = tracked.reduce((sum, s) => sum + (s.weekWatts ?? 0), 0);
  // No baseline yet: nothing to judge, so the tree stays as it starts. Baseline but nothing
  // online is an outage, not a saving, so it sits at neutral.
  if (week === 0) return 1;
  if (!tracked.some((s) => s.online)) return 0.5;
  const now = tracked.reduce((sum, s) => sum + (s.online ? (s.latestWatts ?? 0) : 0), 0);
  return Math.min(1, Math.max(0, 0.5 + (1 - now / week) * 1.5));
}

/** Fleet draw against the 7-day average, e.g. -12 for 12% below; null without a baseline. */
export function weekChangePct(servers: ServerSummary[] | undefined): number | null {
  const tracked = servers?.filter((s) => s.weekWatts !== null && s.weekWatts > 0) ?? [];
  const week = tracked.reduce((sum, s) => sum + (s.weekWatts ?? 0), 0);
  if (week === 0 || !tracked.some((s) => s.online)) return null;
  const now = tracked.reduce((sum, s) => sum + (s.online ? (s.latestWatts ?? 0) : 0), 0);
  return Math.round((now / week - 1) * 100);
}

/**
 * How ravaged the tree is, 0 (untouched) toward 1: waste the rules or the AI found and nobody
 * has fixed yet. Eight open recommendations take it about two thirds of the way; it never quite
 * arrives, so every fix still shows.
 */
export function planetBlight(activity: ActivityReport | undefined): number {
  const open = activity?.servers.reduce((sum, s) => sum + s.open, 0) ?? 0;
  return 1 - Math.exp(-open / 8);
}

// The tree reads this; React writes it.
// `panel`: a panel is open, so the tree stands in the space left of it.
// `auth`: the sign-in card takes the right half, so the tree stands in the left.
export type SceneState = { fruits: Fruit[]; more: number; health: number; blight: number; panel: boolean; auth: boolean };
let state: SceneState = { fruits: [], more: 0, health: 1, blight: 0, panel: false, auth: false };
const listeners = new Set<() => void>();
export const getScene = () => state;
export function setScene(patch: Partial<SceneState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export function subscribeScene(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
