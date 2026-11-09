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

export type Satellite = {
  id: number;
  name: string;
  watts: number | null;
  estimated: boolean;
  online: boolean;
  angle: number;
  size: number;
  labelled: boolean;
};

export const MAX_LABELS = 8;

/** Even spacing in server id order so positions stay put as readings change. */
export function layoutSatellites(servers: ServerSummary[]): Satellite[] {
  const sorted = [...servers].sort((a, b) => a.id - b.id);
  const draw = (s: ServerSummary) => (s.online ? (s.latestWatts ?? 0) : -1);
  const max = Math.max(1, ...sorted.filter((s) => s.online).map((s) => s.latestWatts ?? 0));
  const top = new Set(
    [...sorted].sort((a, b) => draw(b) - draw(a) || a.id - b.id).slice(0, MAX_LABELS).map((s) => s.id),
  );
  return sorted.map((s, i) => ({
    id: s.id,
    name: s.name,
    watts: s.latestWatts,
    estimated: !!s.isEstimated,
    online: s.online,
    angle: (i / sorted.length) * 2 * Math.PI,
    size: s.online ? Math.min(1.6, 0.6 + (s.latestWatts ?? 0) / max) : 0.6,
    labelled: top.has(s.id),
  }));
}

/** Fleet draw against the 7-day average, e.g. -12 for 12% below; null without a baseline. */
export function weekChangePct(servers: ServerSummary[] | undefined): number | null {
  const tracked = servers?.filter((s) => s.weekWatts !== null && s.weekWatts > 0) ?? [];
  const week = tracked.reduce((sum, s) => sum + (s.weekWatts ?? 0), 0);
  if (week === 0 || !tracked.some((s) => s.online)) return null;
  const now = tracked.reduce((sum, s) => sum + (s.online ? (s.latestWatts ?? 0) : 0), 0);
  return Math.round((now / week - 1) * 100);
}

// Read every frame by the scene; React writes it.
export type OrbitState = { satellites: Satellite[]; health: number; panel: boolean; focusId: number | null };
let state: OrbitState = { satellites: [], health: 1, panel: false, focusId: null };
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

// Where the scene drew each satellite on its last frame, in CSS pixels. Kept here rather than in
// OrbitScene so the labels can read it without pulling three.js into the main bundle.
// Empty when nothing is drawn (no WebGL, narrow screens), which hides the labels.
export type LabelPosition = { x: number; y: number; behind: boolean };
const labelPositions = new Map<number, LabelPosition>();
const frameListeners = new Set<() => void>();
export const getLabelPositions = () => labelPositions;
export function subscribeFrame(cb: () => void) {
  frameListeners.add(cb);
  return () => void frameListeners.delete(cb);
}
export const publishFrame = () => frameListeners.forEach((cb) => cb());
