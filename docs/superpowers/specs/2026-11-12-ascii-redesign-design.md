# ASCII redesign

Approved 2026-11-12. Replaces the Tree design (2026-11-11) everywhere: the whole UI becomes a real character grid on a black terminal, and the tree becomes hand-drawn ASCII art. Routes, panels, data and `lib/scene.ts` stay as they are.

## Rules

- One monospace face for everything: D2Coding (OFL, self-hosted woff2 in `fonts/`). Hangul is exactly two columns, so the grid never drifts. Paperlogy, IBM Plex Mono and the Google Fonts link go.
- Dark only: black terminal background. AA contrast for all text.
- Every line on screen is a character: box-drawing `┌─┐│└┘├┤` for frames and rules, no CSS borders, radii, shadows, gradients or glow.
- Colour roles stay: one green for "good" and primary actions; amber and red only for risk and "needs attention". The tree's greens and autumn ambers are illustration colours, not UI signals.
- Every W value keeps the 실측/추정 marker.
- Real `<button>`, `<input>`, `<select>`, `<a>` stay underneath; only their look changes.
- `prefers-reduced-motion`: nothing moves.
- Nothing decorative that does not show real data or lead to an action.

## Palette (`styles/base.css` tokens)

| Token | Role | Value (to be tuned for AA) |
|---|---|---|
| `--paper` | background | `#0c0f0a` |
| `--surface` | panel fill | `#0c0f0a` (same; frames separate, not fills) |
| `--line` | frame and rule characters | `#4a5a44` |
| `--ink` | text | `#cfe3c4` |
| `--ink-2` | secondary text | `#8fa385` |
| `--go` / `--on-go` | good, primary action / text on it | `#7ee07a` / `#0c0f0a` |
| `--warn` | risk | `#e0a640` |
| `--bad` | needs attention | `#ff6b5e` |

## Components

| Unit | Change |
|---|---|
| `lib/tree.ts` | `treeState()` and `layoutFruits()` keep their meaning and tests. The SVG geometry (`LEAF_CLUSTERS`, `DEAD_BRANCHES`, `LITTER`, `FRUIT_SLOTS` in viewBox units) is replaced by a hand-drawn art grid: `TREE_ART` (the characters) plus `TREE_MASK` (same size; each cell tags which part it belongs to: trunk, leaf cluster n, dead branch n, litter patch n). `FRUIT_SLOTS` become `[col, row]` cells in the crown. Cluster count stays 22, dead branches 6, litter 8, fruit slots 12, so `treeState` is unchanged. Inner clusters get low indices, so a thinning crown drops from the rim. A test checks the art and mask line up and every index is present. |
| `components/Tree.tsx` | Renders the grid as one `<pre>`: a cell shows if its part is visible in `state` (leaf cluster `< leaves`, dead branch `< deadBranches`, litter `< litter`), else a space. Leaf colour mixes green→amber by `state.autumn`. Falling leaves are `'` characters that drop one row per step (`steps()` animation) from the crown rim. Consecutive cells of one colour join into one `<span>`. |
| `components/TreeStage.tsx` | Same placement rules as now. Fruits are characters on their slot cell: `o` / `O` / `@` by draw (light to heavy), offline `·` in `--ink-2`; each is a link to `/servers/:id`. Labels sit to the right of the fruit in the same grid: `web-01 142W 실측`. `+n` stays as a link to `/servers`. Phones: same art scaled down by font size. |
| `components/Panel.tsx` | Frame `┌─ 서버 › web-01 ──────── [x] ┐`, sides `│`, foot `└──┘`. Breadcrumb and close live in the top rule. Sections inside split by `├──┤`. Frames are drawn with CSS pseudo-elements carrying long runs of box characters (clipped by `overflow: hidden`), so they follow any width; heights snap to the line height. One shared `.frame` class, reused by the top bar, sign-in card and panel sections. |
| `components/TopBar.tsx` | One framed line: `green-server ── [1 서버] [2 리포트] [3 계정] ── 3/4 온라인 ── [로그아웃]`. |
| Buttons | `[ 승인 ]`; the primary is reversed (`--go` fill, `--on-go` text); hover and focus reverse any button. |
| Inputs | `> ` prompt before the field, no box, an underline of `─`, caret-coloured `--go`. Checkboxes `[x]`/`[ ]`, radios `(•)`/`( )`, selects `< 7일 >`. |
| `components/Power.tsx` | Same markup; `142W 실측` with a solid underline, `~88W 추정` with a dashed underline. Digit rolling is removed (values just change). |
| `components/PowerChart.tsx` | Block-character chart in a `<pre>` sized in columns from the measured width: measured runs `▁▂▃▄▅▆▇█` in `--go`, estimated runs `░` in `--ink-2`, peak marked `▲`, axes `│` `└─┼─`. Pointer and keyboard picking stay, by column. |
| Status, reports, consult, account, new-server pages | Restyled through the shared classes; no structural change. |
| `DESIGN.md` | Rewritten for the ASCII design (it still describes the planet). |

## Motion

Panels appear without sliding; digits do not roll. The only motion is the falling-leaf characters when the fleet runs above its average, and the text caret. Under `prefers-reduced-motion` neither moves.

## Removed

- Paperlogy fonts, the Google Fonts link for IBM Plex Mono.
- The SVG tree, sway and opacity fades, panel slide, digit rolling.
- `public/icon.svg` and `Logo.tsx` become the single character `❦` in `--go`, so the favicon and header match.

## Verification

- `npm run lint`, `npm run typecheck`, `npm test` (with the art/mask test), `npm run build`.
- Screenshots at 1440×900 and 390×844 for the four tree states (clear, high draw, open recommendations, both), a panel route with a chart, sign-in, and reduced motion. Check that frames line up with no gaps at both widths and at 125% zoom.
