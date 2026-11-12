// The tree behind every page, as data: which parts to draw for the fleet's state.
// The drawing is a 48 × 24 character grid; TREE_MASK tags each cell of TREE_ART with its part:
// space = nothing, T = trunk and ground (always drawn), 0-9a-l = leaf cluster 0-21,
// A-F = dead branch 0-5, s-z = litter patch 0-7. Inner clusters have low numbers, so a thinning
// crown drops from the rim.
import type { ServerSummary } from "./types";

export const TREE_ART = [
  "                                                ",
  "                   \\        /                   ",
  "                    \\      /                    ",
  "                     \\ ', /                     ",
  "            \\      '*,%#&&'@&.      /           ",
  "             \\   '%#%#%#@%%&*%%.   /            ",
  "              \\**@&@%@%@&#&##*%%% /             ",
  "              ,:%%@&&@&%#&%%%%%%%%&%*           ",
  "           '*%&&@%%%%&#&%&**%&&&#%%*#'          ",
  "           &%#%%&&#%&#%#%&#@*@@*%%%@%%'         ",
  "         %@%%@%%%&%%&%%@#&%&%%&@%*@@&%%:        ",
  "         &@@*%@@%#*&%%%#&@#@&%#%&@%&%@:         ",
  "       \\  ,@%@%%&@&*@%%%%*%**%&#&%&##%:/        ",
  "        \\ %@%%&%%&%#@%%&%*#@%&%@%#:*%@/         ",
  "         \\_*':@@@%#%:%@%%%*',##&@%.__/          ",
  "              .%%@, \\.:&%,,/ '&&%*              ",
  "                     \\|  |/                     ",
  "                      |  |                      ",
  "                      |  |                      ",
  "                      |  |                      ",
  "                      |  |                      ",
  "                      |  |                      ",
  "         .,' ',. ,.,.,|  |,..,' ,., ',.         ",
  "        _____________/    \\_____________        ",
];

export const TREE_MASK = [
  "                                                ",
  "                   E        F                   ",
  "                    E      F                    ",
  "                     E jj F                     ",
  "            C      888jjjj9999      D           ",
  "             C   h88888jj9999999   D            ",
  "              Chhhh8888333999iiii D             ",
  "              44hhhh3333333355ii5bbbb           ",
  "           aaaa444444333333555555bbbbb          ",
  "           aaaaa44444000000055555bbbggg         ",
  "         ffffaaa4441000000002222777ggggg        ",
  "         fff66661111100000022222777777g         ",
  "       A  66666611111110002222227777lllB        ",
  "        A kkkk6ddd1111ccccc222eeee7lllB         ",
  "         AAkkdddddd11ccccccc2eeeeeeBBB          ",
  "              ddddd TccccccT eeeee              ",
  "                     TT  TT                     ",
  "                      T  T                      ",
  "                      T  T                      ",
  "                      T  T                      ",
  "                      T  T                      ",
  "                      T  T                      ",
  "         yyy uuu ssswwT  Txxttt vvv zzz         ",
  "        TTTTTTTTTTTTTT    TTTTTTTTTTTTTT        ",
];

export const LEAF_COUNT = 22;
export const DEAD_COUNT = 6;
export const LITTER_COUNT = 8;

const LEAF_TAGS = "0123456789abcdefghijkl";

export type TreePart = { kind: "trunk" | "leaf" | "dead" | "litter"; n: number };

/** What a mask character stands for; null for an empty cell. */
export function cellPart(tag: string): TreePart | null {
  if (tag === "T") return { kind: "trunk", n: 0 };
  if (LEAF_TAGS.includes(tag)) return { kind: "leaf", n: LEAF_TAGS.indexOf(tag) };
  if (tag >= "A" && tag <= "F") return { kind: "dead", n: tag.charCodeAt(0) - 65 };
  if (tag >= "s" && tag <= "z") return { kind: "litter", n: tag.charCodeAt(0) - 115 };
  return null;
}

/** Where fruits hang, [col, row], in the order servers fill them. Left of centre labels go left. */
export const FRUIT_SLOTS: [number, number][] = [
  [24, 10], [17, 8], [31, 8], [19, 13], [30, 13], [22, 6],
  [12, 11], [36, 11], [27, 6], [15, 10], [34, 9], [15, 12],
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
    leaves: Math.max(3, Math.round(LEAF_COUNT * (1 - 0.66 * autumn) * (1 - 0.5 * blight))),
    autumn,
    falling: autumn,
    deadBranches: Math.round(DEAD_COUNT * blight),
    litter: Math.round(LITTER_COUNT * blight),
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
