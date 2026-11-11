// The tree behind every page, as data: which parts to draw for the fleet's state.
// Coordinates are in the SVG's 400 × 400 viewBox; the ground line is at y = 372.
import type { ServerSummary } from "./types";

/** Leaf clusters, cx/cy/r. Inner ones first: a thinning crown drops from the end. */
export const LEAF_CLUSTERS: [number, number, number][] = [
  [200, 140, 62], [160, 170, 48], [245, 165, 50], [200, 95, 46], [150, 120, 42], [252, 115, 44],
  [118, 165, 36], [285, 160, 38], [175, 70, 34], [230, 68, 34], [120, 125, 30], [285, 112, 30],
  [200, 200, 34], [140, 205, 28], [262, 205, 28], [95, 150, 24], [308, 140, 24], [150, 80, 24],
  [255, 82, 24], [200, 48, 24], [100, 190, 20], [305, 185, 20],
];

/** Bare branches that poke out of the crown, one per step of blight. */
export const DEAD_BRANCHES = [
  "M168 212 L102 188 L76 170",
  "M232 206 L300 186 L328 166",
  "M190 180 L132 128 L108 92",
  "M212 176 L270 122 L300 88",
  "M196 150 L184 76 L170 30",
  "M206 150 L228 70 L244 28",
];

/** Patches of dry leaves on the ground, cx/rx. */
export const LITTER: [number, number][] = [
  [150, 16], [252, 14], [120, 12], [282, 13], [186, 12], [222, 15], [96, 10], [306, 11],
];

/** Where fruits hang, cx/cy, in the order servers fill them. */
export const FRUIT_SLOTS: [number, number][] = [
  [200, 150], [130, 120], [270, 120], [150, 195], [250, 195], [200, 85],
  [90, 180], [310, 172], [200, 228], [150, 68], [250, 68], [112, 232],
];

export const MAX_LABELS = 8;

export type TreeState = { leaves: number; autumn: number; falling: number; deadBranches: number; litter: number };

/**
 * `health`: draw against the 7-day average, 0.5 at the average (see planetHealth).
 * `blight`: open recommendations, 0 toward 1 (see planetBlight).
 */
export function treeState(health: number, blight: number): TreeState {
  const autumn = Math.min(1, Math.max(0, (0.5 - health) / 0.5));
  return {
    leaves: Math.max(3, Math.round(LEAF_CLUSTERS.length * (1 - 0.66 * autumn) * (1 - 0.5 * blight))),
    autumn,
    falling: autumn,
    deadBranches: Math.round(DEAD_BRANCHES.length * blight),
    litter: Math.round(LITTER.length * blight),
  };
}

export type Fruit = {
  id: number;
  name: string;
  watts: number | null;
  estimated: boolean;
  online: boolean;
  slot: number;
  radius: number;
  labelled: boolean;
};

/** Servers in id order, so a fruit stays on its branch as readings change. */
export function layoutFruits(servers: ServerSummary[]): { fruits: Fruit[]; more: number } {
  const shown = [...servers].sort((a, b) => a.id - b.id).slice(0, FRUIT_SLOTS.length);
  const draw = (s: ServerSummary) => (s.online ? (s.latestWatts ?? 0) : -1);
  const max = Math.max(1, ...shown.filter((s) => s.online).map((s) => s.latestWatts ?? 0));
  const top = new Set([...shown].sort((a, b) => draw(b) - draw(a) || a.id - b.id).slice(0, MAX_LABELS).map((s) => s.id));
  const fruits = shown.map((s, slot) => ({
    id: s.id,
    name: s.name,
    watts: s.latestWatts,
    estimated: !!s.isEstimated,
    online: s.online,
    slot,
    radius: s.online ? 7 + 7 * Math.min(1, (s.latestWatts ?? 0) / max) : 7,
    labelled: top.has(s.id),
  }));
  return { fruits, more: servers.length - top.size };
}
