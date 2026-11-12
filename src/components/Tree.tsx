import type { ReactNode } from "react";
import { TREE_ART, TREE_MASK, cellPart, type TreeState } from "@/lib/tree";

const GREENS = ["#5fcf5a", "#7ee07a", "#4fb84b", "#96e88e"];
const AUTUMN = ["#e0a640", "#ecb85a", "#c98a2e", "#e6c05c"];
const BARK = "#b08a5a";
const DEAD = "#8a7a66";
const LITTER = ["#b0905e", "#9c7d50"];
// Falling leaves start under the crown's rim, left to right.
const FALL_FROM = [16, 31, 19, 28, 23, 15];
const FALL_ROW = 15;

function mix(a: string, b: string, t: number) {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t)).join(" ")})`;
}

/** The colour a cell is drawn in, or null when its part is hidden for this state. */
function cellColor(tag: string, state: TreeState): string | null {
  const part = cellPart(tag);
  if (!part) return null;
  if (part.kind === "trunk") return BARK;
  if (part.kind === "leaf") return part.n < state.leaves ? mix(GREENS[part.n % 4], AUTUMN[part.n % 4], state.autumn) : null;
  if (part.kind === "dead") return part.n < state.deadBranches ? DEAD : null;
  return part.n < state.litter ? LITTER[part.n % 2] : null;
}

/** One line of the drawing, with runs of one colour joined into one span. */
function Line({ row, state }: { row: number; state: TreeState }) {
  const out: ReactNode[] = [];
  let run = "";
  let color: string | null = null;
  const flush = () => {
    if (run) out.push(color ? <span key={out.length} style={{ color }}>{run}</span> : run);
    run = "";
  };
  [...TREE_ART[row]].forEach((ch, col) => {
    const c = cellColor(TREE_MASK[row][col], state);
    if (c !== color && c !== null) {
      flush();
      color = c;
    }
    run += c === null ? " " : ch;
  });
  flush();
  return out;
}

/** The ASCII tree: trunk, crown, bare branches and litter, all from `state`. */
export function Tree({ state }: { state: TreeState }) {
  const falling = Math.round(FALL_FROM.length * state.falling);
  return (
    <>
      <pre className="tree" aria-hidden="true">
        {TREE_ART.map((_, row) => (
          <div key={row}>
            <Line row={row} state={state} />
          </div>
        ))}
      </pre>
      {FALL_FROM.slice(0, falling).map((col, i) => (
        <span
          key={i}
          className="tree-falling"
          aria-hidden="true"
          style={{ left: `${col}ch`, top: `${FALL_ROW}lh`, color: AUTUMN[i % 4], animationDelay: `${i * 1.1}s` }}
        >
          '
        </span>
      ))}
    </>
  );
}
