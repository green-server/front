import { DEAD_BRANCHES, LEAF_CLUSTERS, LITTER, type TreeState } from "@/lib/tree";

const GREENS = ["#5f9e54", "#6fae62", "#548f4a", "#79b86b"];
const AUTUMN = ["#c9a443", "#d6b04c", "#b98f37", "#c2903a"];
// Falling leaves start at the crown's rim, left to right.
const FALL_FROM = [110, 300, 150, 260, 200, 128];

function mix(a: string, b: string, t: number) {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t)).join(" ")})`;
}

/** The flat tree: trunk, crown, bare branches and litter, all from `state`. */
export function Tree({ state }: { state: TreeState }) {
  const falling = Math.round(FALL_FROM.length * state.falling);
  return (
    <svg className="tree" viewBox="0 0 400 400" aria-hidden="true">
      <ellipse cx="200" cy="374" rx="150" ry="9" fill="#e2d8bf" />
      {LITTER.slice(0, state.litter).map(([cx, rx], i) => (
        <ellipse key={i} className="tree-fade" cx={cx} cy="371" rx={rx} ry="4.5" fill={i % 2 ? "#a8875a" : "#9c7d50"} />
      ))}
      <g className="tree-crown">
        <path d="M188 374 C188 320 182 270 192 212 L208 212 C218 270 212 320 212 374 Z" fill="#8a6440" />
        <path d="M196 262 C176 238 150 224 122 214 M204 248 C226 226 252 214 282 204 M198 228 C192 196 186 170 178 140 M202 226 C212 194 224 168 236 138" stroke="#8a6440" strokeWidth="9" strokeLinecap="round" fill="none" />
        {LEAF_CLUSTERS.slice(0, state.leaves).map(([cx, cy, r], i) => (
          <circle key={i} className="tree-leaf" cx={cx} cy={cy} r={r} fill={mix(GREENS[i % 4], AUTUMN[i % 4], state.autumn)} />
        ))}
        {DEAD_BRANCHES.slice(0, state.deadBranches).map((d, i) => (
          <path key={i} className="tree-fade" d={d} stroke="#6e5a44" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ))}
      </g>
      {FALL_FROM.slice(0, falling).map((x, i) => (
        <path
          key={i}
          className="tree-falling"
          style={{ animationDelay: `${i * 1.1}s` }}
          d={`M${x} 150 q-7 -9 0 -16 q7 7 0 16 Z`}
          fill={AUTUMN[i % 4]}
        />
      ))}
    </svg>
  );
}
