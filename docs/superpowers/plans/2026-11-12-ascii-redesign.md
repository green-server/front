# ASCII Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the whole front into a character-grid terminal UI on black, with the tree as hand-drawn ASCII art (spec: `docs/superpowers/specs/2026-11-12-ascii-redesign-design.md`).

**Architecture:** One monospace face (D2Coding, ch = 0.5em, Hangul = 1em) makes `ch` and `lh` the layout units. The tree is a fixed art grid plus a same-size mask; `treeState()` decides which tagged cells are drawn. Frames are 1px lines placed at the centre of the edge cells (where box-drawing glyphs draw their strokes), so they meet character titles and junctions exactly and follow any width without JS. Charts are block characters in a `<pre>`.

**Tech Stack:** React 19, Vite 7, TypeScript, node:test. No new runtime dependencies.

## Global Constraints

- Font: D2Coding regular + bold, subset to Latin, punctuation, arrows, box drawing, blocks, shapes, dingbats, CJK punctuation, Hangul jamo and syllables, fullwidth forms; self-hosted woff2 in `src/fonts/`, OFL notice kept.
- Tokens: `--paper #0c0f0a`, `--line #4a5a44`, `--ink #cfe3c4`, `--ink-2 #8fa385`, `--go #7ee07a`, `--on-go #0c0f0a`, `--warn #e0a640`, `--bad #ff6b5e`. AA for all text.
- No radii, shadows, gradients, glow, fills on frames.
- Every W value keeps 실측/추정 (`components/Power.tsx`).
- `prefers-reduced-motion`: nothing moves.
- Commit messages in English, no attribution trailers.

---

### Task 1: Terminal base

**Files:** `index.html`, `public/icon.svg`, `src/fonts/*`, `src/styles/base.css`, `src/components/Logo.tsx`, `src/components/Power.tsx`, `src/components/Status.tsx`

- [ ] Replace Paperlogy woff2 files with `D2Coding-Regular.woff2`, `D2Coding-Bold.woff2`, `D2Coding-OFL.md`; drop the Google Fonts links; `theme-color` `#0c0f0a`.
- [ ] `base.css`: tokens above, `--sans` and `--code` both D2Coding, `line-height: 1.5`, headings same size as body (h1 bold + `--go`, h2/h3 bold), no font-size steps except `.power-xl`/`.figure-lg` (2em/3em).
- [ ] `.frame` utility: `position: relative; padding: 1lh 2ch;` with `::before` an absolute 1px `--line` rectangle inset `0.5lh 0.5ch`. `.frame-title` sits on the top line with `--paper` background and `padding: 0 1ch`.
- [ ] `.rule`: a `├────┤` line made the same way (1px top line at mid-line, from 0.5ch to the frame's sides).
- [ ] Buttons: `.btn::before { content: "[ " } .btn::after { content: " ]" }`, no border/radius; hover/focus reverse (`--ink` bg, `--paper` text); `.btn-go` reversed `--go`; `.btn-danger` `--bad` text, reversed on hover; `.btn-quiet` no brackets.
- [ ] Fields: `> ` prefix via `.field` label, inputs transparent with a dashed `--line` bottom rule only, caret `--go`; selects `appearance: none` with `< >` around via wrapper text.
- [ ] Power: `~` prefix on estimated (`::before` on `.is-estimated .power-value`), remove `.digit` rolling (Digits renders text only).
- [ ] Loading: `불러오는 중` + three `░░░░░░░░░░` lines instead of grey bars. OnlineState: `●`/`○` characters instead of dot.
- [ ] Logo: `<span className="logo" aria-label="Green Server" role="img">❦</span>`; `public/icon.svg` draws `❦` in `#7ee07a` on `#0c0f0a`.
- [ ] Verify: `npm run typecheck && npm run lint`. Commit `Switch to a monospace terminal base`.

### Task 2: ASCII tree

**Files:** `src/lib/tree.ts`, `src/lib/tree.test.ts`, `src/components/Tree.tsx`, `src/components/TreeStage.tsx`, `src/styles/tree.css`

**Interfaces:**
- Produces: `TREE_ART: string[]`, `TREE_MASK: string[]` (24 rows × 48 cols), `LEAF_COUNT = 22`, `DEAD_COUNT = 6`, `LITTER_COUNT = 8`, `FRUIT_SLOTS: [col, row][]` (12), `cellPart(mask: string): { kind: "trunk" | "leaf" | "dead" | "litter"; n: number } | null`. `treeState` and `layoutFruits` unchanged in signature.
- Mask alphabet: space = empty, `T` = trunk/limbs/ground, `0-9a-l` = leaf cluster 0–21, `A-F` = dead branch 0–5, `s-z` = litter 0–7.

- [ ] Tests first in `tree.test.ts`: art and mask have 24 rows of 48 chars; every mask cell that is not a space has a non-space art char and vice versa; every leaf 0–21, dead 0–5, litter 0–7 index appears; every fruit slot sits on a leaf cell; existing treeState/layoutFruits tests switch from `.length` of the old arrays to the counts.
- [ ] Run `npm test` → fails on missing exports.
- [ ] Paste the composed art and mask (from the draft compose script) into `tree.ts`, add counts and `cellPart`, remove the SVG arrays. Run `npm test` → passes.
- [ ] `Tree.tsx`: `<pre class="tree">`, one line per row, consecutive cells with the same visible part grouped into a `<span>` coloured by part (leaf colour = mix of terminal green and amber by `state.autumn`, per cluster `i % 4`); hidden parts render spaces. Falling leaves: `'` spans at rim columns `[13, 33, 17, 29, 23, 15]`, row 15, `steps(7)` drop to row 22.
- [ ] `TreeStage.tsx`: fruits are links absolutely placed at `left: col ch, top: row lh` inside `.tree-box`, text `o`/`O`/`@` by radius (≤9 / ≤12 / more), offline `·`; labels on the outer side (left for col < 24, right otherwise): `name 142W 실측`, `--paper` background. `+n` link under the ground line.
- [ ] `tree.css`: `.tree-stage` is a size container; `.tree-box` font-size `min(calc(70cqh / 24 / 1.2), calc(96cqw / 36))`, `line-height: 1.2`; reduced motion hides falling leaves.
- [ ] Verify: `npm test && npm run typecheck`. Commit `Draw the tree in ASCII`.

### Task 3: Shell

**Files:** `src/components/TopBar.tsx`, `src/components/Panel.tsx`, `src/styles/shell.css`

- [ ] Top bar: one row, brand `❦ Green Server`, nav items `[1 홈] [2 서버] …` (number = existing shortcut), `3/4 연결`, `[ 로그아웃 ]`, a `─` rule beneath (1px at mid-line of a bar-height row). Current item reversed.
- [ ] Panel: `.panel.frame`; head is the frame title line: `← 서버 › 제목` on the left, `[x]` close on the right, both on the top line with `--paper` background. Sections inside separated by `.rule`. No slide animation.
- [ ] Phone: tab bar the same bracket style along a `─` top rule; panel full-screen frame.
- [ ] Verify typecheck/lint, browser check of `/servers`. Commit `Frame the shell in box lines`.

### Task 4: ASCII power chart

**Files:** `src/components/PowerChart.tsx`, `src/styles/server.css` (chart rules)

- [ ] Measure the box width and the width of `0` (1ch) → `cols = floor(width / ch) - 7` (axis labels + `┤`), 12 rows.
- [ ] Bucket metrics by time into `cols` columns (the axis spans `start..last` as now); each column keeps its max watts, whether it is estimated (last point's flag) and the last metric index.
- [ ] Render rows top→bottom: tick label right-aligned in 6 cols + `┤` on tick rows else `│`; measured columns: full `█` cells and the top cell an eighth block `▁▂▃▄▅▆▇`; estimated columns `░`; empty columns spaces. Bottom: `└` + `─` with `▲` under the peak column; then time labels row.
- [ ] Picking: pointer x → column → its last metric index; keyboard as now. The picked column renders reversed. A status line under the chart: `142W 실측 · 11. 12. 17:30 · CPU 12% · 메모리 40%`, and `▲ 최고 300W`. Legend `█ 실측  ░ 추정`.
- [ ] Keep `role="slider"` and aria values.
- [ ] Verify typecheck, browser check on a server page. Commit `Draw the power chart in block characters`.

### Task 5: Pages

**Files:** `src/styles/home.css`, `auth.css`, `server.css`, `consult.css`, `reports.css`

- [ ] Replace every border/radius/background box with `.frame`-style lines or nothing; segmented controls and choice radios become bracket buttons (`[7일]` reversed when pressed); level steps become `[정상] [주의] …` with the current reversed in its colour; `.command` and `.session` become frames with `$ ` prefix on commands; `<details>` caret becomes `▸`/`▾` characters; lists use `-`/`1.` text markers.
- [ ] Verify typecheck/lint/build; browser check every route at 1440×900 and 390×844. Commit `Restyle pages for the terminal grid`.

### Task 6: Docs and verification

- [ ] Rewrite `DESIGN.md` for the ASCII design.
- [ ] Amend the spec: frames are 1px lines at the centre of the edge cells (not clipped character runs).
- [ ] `npm run lint && npm run typecheck && npm test && npm run build`; screenshots of four tree states, a panel with a chart, sign-in, phone, reduced motion. Commit `Document the ASCII design`, push.
