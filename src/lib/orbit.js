/**
 * How green the planet is, 0 (parched) to 1 (lush): total draw now against the 7-day average.
 * At the average it is 0.5; a third below is fully green, a third above fully dry.
 * A server that is offline draws nothing now, the same as the savings report counts it.
 * `weekWatts` is a server's average draw over the last 7 days, null with no samples.
 */
export function planetHealth(servers) {
  const tracked = servers?.filter((s) => s.weekWatts !== null && s.weekWatts > 0) ?? [];
  const week = tracked.reduce((sum, s) => sum + (s.weekWatts ?? 0), 0);
  // No baseline yet: nothing to judge, so the planet stays as it starts. Baseline but nothing
  // online is an outage, not a saving, so it sits at neutral.
  if (week === 0) return 1;
  if (!tracked.some((s) => s.online)) return 0.5;
  const now = tracked.reduce((sum, s) => sum + (s.online ? (s.latestWatts ?? 0) : 0), 0);
  return Math.min(1, Math.max(0, 0.5 + (1 - now / week) * 1.5));
}

/**
 * How ravaged the planet is, 0 (untouched) toward 1: waste the rules or the AI found and nobody
 * has fixed yet. Eight open recommendations take it about two thirds of the way; it never quite
 * arrives, so every fix still shows.
 */
export function planetBlight(activity) {
  const open = activity?.servers.reduce((sum, s) => sum + s.open, 0) ?? 0;
  return 1 - Math.exp(-open / 8);
}

// Read every frame by the scene; React writes it.
// `auth`: the sign-in card takes the right half, so the planet centres in the left.
// `pin`: the open server's place; the planet stops and turns it to face the viewer.
let state = { health: 1, blight: 0, panel: false, auth: false, pin: null };
const listeners = new Set();
export const getOrbit = () => state;
export function setOrbit(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export function subscribeOrbit(listener) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
