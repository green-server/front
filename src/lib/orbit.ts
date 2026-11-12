import type { ActivityReport, ServerSummary } from "./types";

/**
 * How green the planet is, 0 (parched) to 1 (lush): total draw now against the 7-day average.
 * At the average it is 0.5; a third below is fully green, a third above fully dry.
 * A server that is offline draws nothing now, the same as the savings report counts it.
 */
export function planetHealth(servers: ServerSummary[] | undefined): number {
  const tracked = servers?.filter((s) => s.weekWatts !== null && s.weekWatts > 0) ?? [];
  const week = tracked.reduce((sum, s) => sum + (s.weekWatts ?? 0), 0);
  // No baseline yet: nothing to judge, so the planet stays as it starts. Baseline but nothing
  // online is an outage, not a saving, so it sits at neutral.
  if (week === 0) return 1;
  if (!tracked.some((s) => s.online)) return 0.5;
  const now = tracked.reduce((sum, s) => sum + (s.online ? (s.latestWatts ?? 0) : 0), 0);
  return Math.min(1, Math.max(0, 0.5 + (1 - now / week) * 1.5));
}

export type Satellite = {
  id: number;
  online: boolean;
  angle: number;
  size: number;
};

/** Even spacing in server id order so positions stay put as readings change. */
export function layoutSatellites(servers: ServerSummary[]): Satellite[] {
  const sorted = [...servers].sort((a, b) => a.id - b.id);
  const max = Math.max(1, ...sorted.filter((s) => s.online).map((s) => s.latestWatts ?? 0));
  return sorted.map((s, i) => ({
    id: s.id,
    online: s.online,
    angle: (i / sorted.length) * 2 * Math.PI,
    size: s.online ? Math.min(1.6, 0.6 + (s.latestWatts ?? 0) / max) : 0.6,
  }));
}

/**
 * How ravaged the planet is, 0 (untouched) toward 1: waste the rules or the AI found and nobody
 * has fixed yet. Eight open recommendations take it about two thirds of the way; it never quite
 * arrives, so every fix still shows.
 */
export function planetBlight(activity: ActivityReport | undefined): number {
  const open = activity?.servers.reduce((sum, s) => sum + s.open, 0) ?? 0;
  return 1 - Math.exp(-open / 8);
}

// Read every frame by the scene; React writes it.
// `auth`: the sign-in card takes the right half, so the planet centres in the left.
// `pin`: the open server's place; the planet stops and turns it to face the viewer.
export type Pin = { lat: number; lon: number };
export type OrbitState = { satellites: Satellite[]; health: number; blight: number; panel: boolean; auth: boolean; pin: Pin | null };
let state: OrbitState = { satellites: [], health: 1, blight: 0, panel: false, auth: false, pin: null };
const listeners = new Set<() => void>();
export const getOrbit = () => state;
export function setOrbit(patch: Partial<OrbitState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export function subscribeOrbit(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
