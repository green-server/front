# Tree Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3D planet backdrop with one flat SVG tree on cream paper, driven by the same health and blight signals, with servers as fruits.

**Architecture:** `lib/tree.ts` turns `health`, `blight` and the server list into a drawing description (pure, tested). `lib/scene.ts` replaces `lib/orbit.ts` as the store pages write to. `TreeStage` is a fixed layer that lays the tree out with CSS only (home centred, beside the panel, left half on sign-in, top band on phones) and renders `Tree` (SVG) plus HTML fruits and labels. three.js and everything planet-related is deleted; the stylesheet tokens flip to a light paper theme.

**Tech Stack:** React 19, React Router 7, Vite, plain CSS, node:test.

## Global Constraints

- Light only: cream paper background, no dark theme. AA contrast for all text on cream.
- Flat illustration: rounded shapes, solid fills, no gradients, glow or textures.
- Paperlogy for UI, IBM Plex Mono for commands and logs only.
- One green for "good" and primary actions; amber and red only for risk and "needs attention".
- Every W value keeps the 실측/추정 marker.
- `prefers-reduced-motion`: no sway, no falling leaves, instant transitions.
- Commit messages in English, no AI attribution; push to main after each task.

---

### Task 1: Data-to-drawing mapping and the store

**Files:**
- Create: `src/lib/tree.ts`, `src/lib/tree.test.ts`
- Rename: `src/lib/orbit.ts` → `src/lib/scene.ts`, `src/lib/orbit.test.ts` → `src/lib/scene.test.ts`
- Modify: `package.json` (test script)

**Interfaces:**
- Produces `treeState(health: number, blight: number): TreeState` with `TreeState = { leaves: number; autumn: number; falling: number; deadBranches: number; litter: number }`.
- Produces `layoutFruits(servers: ServerSummary[]): { fruits: Fruit[]; more: number }`, `Fruit = { id; name; watts; estimated; online; slot: number; radius: number; labelled: boolean }`.
- Constants `LEAF_CLUSTERS`, `DEAD_BRANCHES`, `LITTER`, `FRUIT_SLOTS` (viewBox 0 0 400 400 coordinates), `MAX_LABELS = 8`.
- `scene.ts` keeps `planetHealth`, `planetBlight`, `weekChangePct` and exports `getScene/setScene/subscribeScene` over `{ fruits: Fruit[]; more: number; health: number; blight: number; panel: boolean; auth: boolean }`.

Mapping (exact):
- `autumn = clamp((0.5 - health) / 0.5, 0, 1)` — 0 at or below the average, 1 at health 0.
- `leaves = max(3, round(LEAF_CLUSTERS.length * (1 - 0.66 * autumn) * (1 - 0.5 * blight)))`.
- `falling = autumn`; `deadBranches = round(DEAD_BRANCHES.length * blight)`; `litter = round(LITTER.length * blight)`.
- Fruits: id order into `FRUIT_SLOTS` (first 12 servers); `radius = online ? 7 + 7 * min(1, watts / maxOnlineWatts) : 7`; labelled = top `MAX_LABELS` shown fruits by draw; `more = servers.length - labelled count`.

- [ ] Write `tree.test.ts` (clear tree full and green; autumn only above the average; worst keeps ≥3 clusters; dead branches and litter grow with blight; fruit slots in id order, radius grows with draw, offline grey radius 7, 8 labels max, `more` counts the rest).
- [ ] Run `npm test` → fails (module missing).
- [ ] Implement `tree.ts`; move `orbit.ts` → `scene.ts` dropping satellites, pins, hover and label positions.
- [ ] `npm test` passes; commit "Map fleet state to a tree drawing".

### Task 2: Tree, stage and wiring; delete the planet

**Files:**
- Create: `src/components/Tree.tsx`, `src/components/TreeStage.tsx`, `src/styles/tree.css`
- Modify: `src/main.tsx`, `src/AppLayout.tsx`, `src/components/Panel.tsx`, `src/components/AuthForm.tsx`, `src/pages/Server.tsx`, `src/styles/home.css`, `src/styles/auth.css`
- Delete: `src/components/OrbitScene.tsx`, `src/components/planetShaders.ts`, `src/components/SatelliteLabels.tsx`, `src/lib/sun.ts`, `src/lib/sun.test.ts`, `src/styles/scene.css`, `public/earth/`, `public/planet.png`; `npm uninstall three @types/three`

Behaviour:
- `Tree` draws trunk, branches, `LEAF_CLUSTERS` (first `leaves` shown, outer clusters dropped first), colour per cluster mixed from greens to autumn by `autumn`, `deadBranches` bare branches, `litter` dry-leaf patches, and `round(6 * falling)` falling leaves (CSS keyframes). Crown sways ±1° over 6 s. Fills transition over 1 s.
- `TreeStage` is `position: fixed` behind pages; a square `.tree-box` (`width: min(64vh, 90%)`) holds the SVG and HTML fruits at slot percentages. Fruits link to `/servers/:id`, raise and outline on hover/focus. Labels (name + `Power` sm) and the "+n" link show on the home route only.
- Layout classes from the store: `.is-panel` → the stage's right edge stops at `calc(min(60vw, 880px) + 32px)`; `.is-auth` → right half free. Phones (<760px): stage is a 40vh band under the top bar, no labels.
- `Server.tsx` drops the pin effect; keeps the location text.
- `prefers-reduced-motion`: no sway, no falling leaves, no transitions.

- [ ] Build components and CSS, wire them, delete the planet files and three.js.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` pass; `grep -r three dist` finds nothing.
- [ ] Commit "Replace the planet with a tree".

### Task 3: Paper theme

**Files:** `src/styles/base.css`, `shell.css`, `home.css`, `server.css`, `reports.css`, `consult.css`, `auth.css`, `src/components/Logo.tsx` if it hardcodes colour.

- Tokens: `color-scheme: light; --paper: #f4efe3; --surface: rgb(255 253 247 / 0.94); --line: rgb(60 50 30 / 0.14); --ink: #26301f; --ink-2: #5c5a4c; --go: #2f7d3a; --on-go: #ffffff; --warn: #a15c00; --bad: #b4372b;` (`--space` renamed `--paper` everywhere).
- White-alpha fills (`rgb(255 255 255 / x)`) become ink-alpha (`rgb(38 48 31 / x)`); black overlays in consult.css stay dark only where they hold mono logs.

- [ ] Restyle; check contrast of `--ink-2`, `--go`, `--warn`, `--bad` on `--paper` ≥ 4.5.
- [ ] Commit "Switch to the paper theme".

### Task 4: Verify

- [ ] Screenshots 1440×900 and 390×844: clear, high draw, open recommendations, both, a panel route, sign-in, reduced motion.
- [ ] Fix what looks wrong; push.
