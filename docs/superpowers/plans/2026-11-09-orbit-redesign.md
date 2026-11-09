# Orbit Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the console UI with one persistent 3D orbit scene (live planet + server satellites) and right-hand panels for every other screen, per `docs/superpowers/specs/2026-11-09-orbit-redesign-design.md`.

**Architecture:** A module-level store (`src/lib/orbit.ts`) holds servers, planet health and whether a panel is open. `OrbitScene` (three.js, mounted once above the router) reads it every frame; `AppLayout` fills it from `/api/servers` + live events and decides home vs panel from the route. Styles move out of the 2,500-line `globals.css` into `src/styles/` files owned by one task each, so tasks can run in parallel.

**Tech Stack:** React 19, React Router 7, Vite 7, three.js 0.181, TypeScript; backend Node + Express + mysql2.

## Global Constraints

- Nothing that does not show real data or lead to an action: no decorative captions, no English HUD labels, no "지구 상태", no tree metaphors, no tagline copy, no corner brackets, no gradients or glow, no fly-in effects.
- Palette tokens (dark only): `--space #05080f`, `--surface rgb(12 18 30 / 0.86)`, `--line rgb(255 255 255 / 0.1)`, `--ink #eef2f6`, `--ink-2 #9aa6b5`, `--go #4fe39a` (good + primary action), `--on-go #04140b`, `--warn #f2b544`, `--bad #ff6b5e`. AA contrast for all text.
- Type: Paperlogy (`--sans`) for UI; IBM Plex Mono (`--code`) for commands and logs only.
- Every W value keeps the 실측/추정 marker via the existing `Power` component (solid underline + 실측, dashed + 추정).
- `prefers-reduced-motion: reduce`: no rotation, no camera easing, no CSS transitions.
- No WebGL: static planet image (`public/planet.png`) and satellites fall back to a list.
- Korean UI copy, plain and short. Commit messages in English, no AI attribution.
- Commands: front `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` (in `front/`); back `npm test` (in `back/`, needs local MySQL with `green_server_test`).

---

### Task 1: Backend CO₂ fields

**Files:**
- Modify: `back/src/fees.ts` (add constant + helper)
- Modify: `back/src/models.ts` (`serverSummaries` adds `monthlyCo2Kg`)
- Modify: `back/src/savings.ts` (items + bySource add `savedCo2KgMonth`; add `total`)
- Test: `back/test/fees.test.ts` (if a fees test file exists, add there; else add to `back/test/api.test.ts`)
- Modify: `plan/docs/api.md` (document fields)

**Interfaces:**
- Produces: `CO2_KG_PER_KWH = 0.4594`, `co2Kg(kwh: number): number` (rounded to 2 decimals) in `back/src/fees.ts`. API: `ServerSummary.monthlyCo2Kg: number`; `SavingsReport.items[].savedCo2KgMonth: number`; `SavingsReport.bySource[].savedCo2KgMonth: number`; `SavingsReport.total: { savedKrwMonth: number; savedCo2KgMonth: number }`.

- [ ] **Step 1: failing tests.** In the summary test (`'summary projects month-to-date ...'` in `back/test/api.test.ts`) add `assert.equal(body.monthlyCo2Kg, Math.round(body.monthlyKwh * 0.4594 * 100) / 100);`. In a savings test that has one applied item, add `assert.equal(report.items[0].savedCo2KgMonth, Math.round(report.items[0].savedKwhMonth * 0.4594 * 100) / 100);` and `assert.equal(report.total.savedKrwMonth, report.items.reduce((s, i) => s + i.savedKrwMonth, 0));`.
- [ ] **Step 2:** `cd back && npm test` → the new assertions fail.
- [ ] **Step 3: implement.**

```ts
// back/src/fees.ts
// Korea's national grid emission factor (온실가스 배출권거래제 국가 전력배출계수), kg CO₂ per kWh.
export const CO2_KG_PER_KWH = 0.4594;
export const co2Kg = (kwh: number) => Math.round(kwh * CO2_KG_PER_KWH * 100) / 100;
```

In `serverSummaries` add `monthlyCo2Kg: co2Kg(monthlyKwh),` after `monthlyKwh`. In `savingsReport` add `savedCo2KgMonth: co2Kg(savedWatts * month.hours / 1000),` to each item; in `bySource` sum `savedCo2KgMonth` the same way as `savedKrwMonth` (round the sum to 2 decimals); add `total: { savedKrwMonth: <sum of items>, savedCo2KgMonth: <rounded sum> }` to the returned object.
- [ ] **Step 4:** `npm test` passes (all existing tests too).
- [ ] **Step 5:** document the four fields in `plan/docs/api.md` next to their types. Commit in `back` ("Add CO₂ to summaries and the savings report") and in `plan` ("Document CO₂ fields"). Push both to `main`.

---

### Task 2: Orbit store and satellite layout (pure logic)

**Files:**
- Create: `front/src/lib/orbit.ts`
- Create: `front/src/lib/orbit.test.ts`
- Modify: `front/package.json` (`test` script runs both test files)
- Delete: `front/src/lib/planet.ts` (its `planetHealth` moves into `orbit.ts`)

**Interfaces:**
- Produces (`src/lib/orbit.ts`):

```ts
import type { ServerSummary } from "./types";

export type Satellite = {
  id: number;
  name: string;
  watts: number | null;
  estimated: boolean;
  online: boolean;
  angle: number;      // radians on the ring, 0..2π
  size: number;       // 0.6..1.6, scales with watts relative to the fleet max
  labelled: boolean;  // true for the 8 highest-draw servers
};

export const MAX_LABELS = 8;

/** 0 parched … 1 lush; unchanged rule from lib/planet.ts. */
export function planetHealth(servers: ServerSummary[] | undefined): number;

/** Even spacing in server id order so positions stay put as readings change. */
export function layoutSatellites(servers: ServerSummary[]): Satellite[];

/** Fleet draw against the 7-day average, e.g. -12 for 12% below; null without a baseline. */
export function weekChangePct(servers: ServerSummary[] | undefined): number | null;

// Store read every frame by the scene; React writes it.
export type OrbitState = { satellites: Satellite[]; health: number; panel: boolean; focusId: number | null };
export function getOrbit(): OrbitState;
export function setOrbit(patch: Partial<OrbitState>): void;
export function subscribeOrbit(listener: () => void): () => void; // for useSyncExternalStore in labels
```

- [ ] **Step 1: tests** (`src/lib/orbit.test.ts`, node:test like `format.test.ts`):

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutSatellites, planetHealth, weekChangePct, MAX_LABELS } from "./orbit.ts";
import type { ServerSummary } from "./types.ts";

const server = (id: number, watts: number | null, over: Partial<ServerSummary> = {}): ServerSummary => ({
  id, name: `s${id}`, kind: "baremetal", ratePlan: "home_tiered", householdKwh: 300, powerSource: "measured",
  lastSeenAt: null, createdAt: "", online: true, latestWatts: watts, weekWatts: 100, isEstimated: false,
  monthlyKwh: 0, monthlyKrw: 0, monthlyCo2Kg: 0, ...over,
});

test("satellites are evenly spaced in id order", () => {
  const sats = layoutSatellites([server(3, 10), server(1, 10), server(2, 10), server(4, 10)]);
  assert.deepEqual(sats.map((s) => s.id), [1, 2, 3, 4]);
  assert.ok(Math.abs(sats[1].angle - sats[0].angle - Math.PI / 2) < 1e-9);
});

test("only the highest-draw servers get labels", () => {
  const list = Array.from({ length: 12 }, (_, i) => server(i + 1, i * 10));
  const labelled = layoutSatellites(list).filter((s) => s.labelled).map((s) => s.id);
  assert.equal(labelled.length, MAX_LABELS);
  assert.deepEqual(labelled, [5, 6, 7, 8, 9, 10, 11, 12]);
});

test("size grows with draw and offline servers are smallest", () => {
  const [a, b, c] = layoutSatellites([server(1, 10), server(2, 100), server(3, 50, { online: false })]);
  assert.ok(b.size > a.size);
  assert.equal(c.size, 0.6);
});

test("week change compares online draw with the 7-day average", () => {
  assert.equal(weekChangePct([server(1, 88), server(2, 88)]), -12);
  assert.equal(weekChangePct([server(1, 50, { weekWatts: null })]), null);
});

test("health keeps the old mapping", () => {
  assert.equal(planetHealth([server(1, 100)]), 0.5);
  assert.equal(planetHealth(undefined), 1);
});
```

- [ ] **Step 2:** set `"test": "node --test --experimental-strip-types src/lib/format.test.ts src/lib/orbit.test.ts"`; run `npm test` → fails (module missing). Add `monthlyCo2Kg: number;` to `ServerSummary` in `src/lib/types.ts` (Task 1's field).
- [ ] **Step 3: implement** `orbit.ts`: copy `planetHealth` verbatim from `src/lib/planet.ts`; `layoutSatellites` sorts by id, `angle = (i / n) * 2π`, `max = max online watts (≥1)`, `size = online ? 0.6 + (watts ?? 0) / max : 0.6` clamped to 1.6, `labelled` = top `MAX_LABELS` by `online ? watts : -1` (ties by id); `weekChangePct` = `Math.round((now / week - 1) * 100)` over servers with `weekWatts > 0`, `now` counting only online servers, null when `week === 0`; store is a plain object + `Set` of listeners (`setOrbit` merges and notifies). Delete `src/lib/planet.ts` and update its imports (`Planet.tsx`, `AppLayout.tsx`) to `orbit.ts` (`getOrbit().health`, `setOrbit({ health })`).
- [ ] **Step 4:** `npm test`, `npx tsc --noEmit`, `npm run lint` pass.
- [ ] **Step 5:** commit "Add the orbit store and satellite layout".

---

### Task 3: OrbitScene (three.js ring, satellites, labels, camera)

Depends on Task 2.

**Files:**
- Create: `front/src/components/OrbitScene.tsx` (replaces `Planet.tsx`; move the shader strings into `front/src/components/planetShaders.ts`)
- Create: `front/src/components/SatelliteLabels.tsx`
- Create: `front/src/styles/scene.css`
- Create: `front/public/planet.png` (static fallback: a 1024×1024 screenshot of the lush planet on transparent/space background, taken with headless Chrome from the running app)
- Delete: `front/src/components/Planet.tsx`
- Modify: `front/src/main.tsx` (lazy-load `OrbitScene` instead of `Planet`)

**Interfaces:**
- Consumes: `getOrbit`, `subscribeOrbit`, `Satellite` from Task 2; `Power` from `src/components/Power.tsx`.
- Produces: `export function OrbitScene(): JSX.Element` (default-exportable for `lazy`); it publishes each satellite's projected screen position via a small API in the same module: `export function getLabelPositions(): Map<number, { x: number; y: number; behind: boolean }>` and `export function subscribeFrame(cb: () => void): () => void` used by `SatelliteLabels`.

Requirements:
- Keep the planet shaders exactly (surface, clouds, halo, stars) — move them into `planetShaders.ts` unchanged except: halo colour mix stays health-driven; nothing else.
- Planet radius 1 at origin, camera fov 32 at z ≈ 6.2 so the planet is ~60% of viewport height on 1440×900. Axial tilt 0.41 rad on the planet only.
- Ring: `THREE.RingGeometry`-free — draw it as a thin `THREE.Line` ellipse (radius 1.75, 128 segments) tilted ~ -0.35 rad around X so the front half passes over the lower planet; colour `rgb(255 255 255 / 0.18)`.
- Satellites: small `THREE.Mesh` spheres (radius 0.025 × size) on the ring at their `angle`, rotating together slowly (0.02 rad/s, stopped under reduced motion). Colour `#eef2f6`, offline `#5b6675`. No glow.
- Each frame: project every satellite to screen pixels; `behind = (satellite world z < 0) && it is inside the planet's screen disc` — labels of hidden satellites fade to 0.25 opacity.
- Panel mode (`getOrbit().panel === true`): ease the whole group (planet + ring) to x = -1.6 (wide screens) and scale 0.8 over ~600 ms, and lower the canvas opacity to 0.45 via a CSS class on the host. Back to centre when false. Instant under reduced motion.
- Narrow screens (`innerWidth < 760`): no ring/satellites/labels, planet at y = +0.9 and smaller (camera z 8).
- WebGL failure: render `<img src="/planet.png" class="scene-fallback" alt="">` instead; `SatelliteLabels` renders nothing (lists elsewhere cover it).
- `SatelliteLabels`: absolutely positioned buttons (`<Link to={`/servers/${id}`}>`) at the projected positions for `labelled` satellites: name (13px, `--ink-2`) over `<Power value estimated size="sm" />`; offline shows "꺼짐" instead of W. When more than `MAX_LABELS` satellites exist, a "+n" chip links to `/servers`. Hidden while a panel is open. Update positions in `subscribeFrame` via refs (no React state per frame).
- `scene.css`: `.scene` fixed inset 0, z-index 0; `.scene.is-dim canvas { opacity: .45; transition: opacity .6s }`; label styles; reduced-motion disables transitions.

- [ ] **Step 1:** create `planetShaders.ts` by moving the GLSL strings out of `Planet.tsx` verbatim.
- [ ] **Step 2:** write `OrbitScene.tsx` per the requirements; mount it in `main.tsx` via `lazy(() => import("@/components/OrbitScene"))`.
- [ ] **Step 3:** write `SatelliteLabels.tsx` and render it inside `AppLayout` (Task 4 wires layout; until then render it in `main.tsx` beside the scene).
- [ ] **Step 4:** verify in the browser (dev server `npx vite --port 3100`, backend running locally with seeded data): 7 labelled satellites around the planet, labels follow the rotation, `/servers/1` dims and shifts the planet. Take `public/planet.png`.
- [ ] **Step 5:** `npm run lint`, `npx tsc --noEmit`, `npm run build` pass; commit "Add the orbit scene with server satellites".

---

### Task 4: App shell — tokens, top bar, panel routing, mobile tab bar

Depends on Task 2 (store). Can run in parallel with Task 3.

**Files:**
- Create: `front/src/styles/base.css` (tokens from Global Constraints, reset, typography, buttons `.btn`, `.btn-go`, `.btn-quiet`, form fields, `.tag` for 실측/추정 and 규칙/AI, focus ring, reduced-motion rule, `Power` component styles `.power*` carried over and restyled)
- Create: `front/src/styles/shell.css` (top bar, panel, tab bar, breadcrumb)
- Create: `front/src/components/TopBar.tsx`, `front/src/components/Panel.tsx`
- Modify: `front/src/AppLayout.tsx` (rewrite)
- Modify: `front/src/main.tsx` (import `styles/base.css`, `styles/shell.css`; add route `servers` → `src/pages/Servers.tsx` placeholder created in Task 6)
- Delete: `front/src/globals.css` at the end of Task 6 (pages still import nothing from it; until then keep importing it so nothing breaks)

**Interfaces:**
- Consumes: `setOrbit`, `layoutSatellites`, `planetHealth` (Task 2).
- Produces:
  - `export function Panel({ title, back, children }: { title: string; back?: { to: string; label: string }; children: ReactNode })` — renders `<section class="panel" aria-label={title}>` with a close link (`✕` with `aria-label="닫기"`, to `/`), optional breadcrumb `← {label}`, an `<h1>` with the title, then children. Sets `setOrbit({ panel: true })` on mount and `false` on unmount. Escape key navigates to `/`.
  - Page components render their own `<title>` and wrap content in `<Panel>` (except Home).
  - CSS classes for pages to use: `.section` (spaced block with `h2`), `.rows` (divided list), `.figure-lg` (big numerals), `.muted`, `.btn*`, `.tag`, `.field`.

Requirements:
- `AppLayout`: renders `<TopBar/>`, live notice, `<SatelliteLabels/>` (home only), and `<Outlet/>` inside `<main id="main">`. Fetches `/api/servers` (refresh every 60 s and on `reconnected`), applies `metric` / `agent_status` live events to its copy, and pushes `setOrbit({ satellites: layoutSatellites(list), health: planetHealth(list) })` whenever the list changes; on unmount resets health to 1 and satellites to [].
- Keep the number keys 1–4 for 홈/서버/절약 리포트/계정 (skip when typing in inputs).
- `TopBar`: leaf `Logo` + "Green Server" (links `/`), centred pill nav (홈, 서버, 절약 리포트, 계정, `aria-current` on the active one; 서버 is active for `/servers*`), right side "{online}/{total} 연결" and a 로그아웃 text button. Transparent background over space; 56px tall.
- Panel: fixed right, top 72px, bottom 16px, width `min(60vw, 880px)`, `--surface` background with 1px `--line` border, 16px radius, own scroll. Opens with a 200 ms slide (none under reduced motion).
- `< 760px`: top bar shows logo + 로그아웃 only; a bottom tab bar (same 4 items) appears; panel becomes full-screen sheet (top 0, radius 0) above the tab bar.

- [ ] **Step 1:** write `base.css` and `shell.css`; import them in `main.tsx` after `globals.css`.
- [ ] **Step 2:** write `TopBar.tsx`, `Panel.tsx`, rewrite `AppLayout.tsx` (drop `PlanetFeed`, `Clock`, the old `.bar` header).
- [ ] **Step 3:** browser check: top bar, keys 1–4, tab bar at 390px width, Escape closes a panel.
- [ ] **Step 4:** lint/tsc/build pass; commit "Rebuild the app shell around the orbit scene".

---

### Task 5: Home HUD

Depends on Tasks 2–4.

**Files:**
- Modify: `front/src/pages/Home.tsx` (rewrite)
- Create: `front/src/styles/home.css` (imported by `Home.tsx`)

Requirements:
- Data: servers from the same `useApi<ServerSummary[]>("/api/servers")` cache as `AppLayout`; `useApi<ActivityReport>("/api/reports/activity")` reloaded on `reconnected`, `consultation` and `tool_call` events.
- Above the planet (centred, top ~96px): one line, e.g. `7일 평균보다 12% 적게` with the number in `--go` (or `많이` with the number in `--warn`); omitted when `weekChangePct` is null.
- Bottom-left: `지금 전체 전력` + `<Power value estimated size="xl" />` (estimated if any reading server is estimated). Bottom-right: `이번 달 예상 요금` + `formatKrw(sum monthlyKrw)` at the same size. No other figures.
- Top-right notice, only when something waits: first pending tool calls (`activity.calls` with `decision === "pending"`): "{serverName} · 명령 승인 대기" + mono command (one line, ellipsis) + `승인하러 가기` → `/consultations/{consultationId}`; then servers with `open > 0`: "{serverName} · 추천 {open}건 · 월 {formatKrw(openSavingKrw)} 절약 예상" → `/servers/{serverId}`. Max 3 rows + "외 n건". Amber left border only on pending command rows.
- No servers: centred "서버 연결하기" `.btn-go` → `/servers/new`, nothing else.
- Loading: nothing extra (the scene is already there). Error: the existing `Failure` component in the notice slot.
- Phone (`< 760px`): the line, the two figures side by side, the notice, then a plain server list (name, Power, ₩) since there are no satellites.

- [ ] **Step 1:** rewrite `Home.tsx` + `home.css`.
- [ ] **Step 2:** browser check at 1440×900 and 390×844 with seeded data (2 pending items) and with zero servers.
- [ ] **Step 3:** lint/tsc/build; commit "Rebuild home as the orbit HUD".

---

### Task 6: Panel pages — servers, server detail, new server

Depends on Task 4 (Panel + base classes). Can run in parallel with Tasks 7 and 8.

**Files:**
- Create: `front/src/pages/Servers.tsx` (route `/servers`)
- Modify: `front/src/pages/Server.tsx`, `front/src/pages/NewServer.tsx`
- Modify: `front/src/components/PowerChart.tsx`, `front/src/components/Status.tsx` (restyle class names only if needed)
- Create: `front/src/styles/server.css`

Requirements:
- Every page wraps its content in `<Panel title=...>`; keep all existing data fetching, live updates and actions exactly as they are — this task changes markup and styling only, except the additions listed.
- `Servers`: rows of name, kind (`KIND_LABEL`), online state, `<Power/>`, `formatKrw(monthlyKrw)/월`; row links to `/servers/:id`; "서버 추가" `.btn-go` in the header.
- `Server`: header = kind · online; big `<Power size="xl"/>`; a three-figure row `이번 달 ₩ · kWh · kg CO₂` (`monthlyCo2Kg`); chart with 1시간/24시간/7일 segmented control; then sections 추천, 전력 상위 프로세스, AI 컨설팅, 컨설팅 기록 as `.section`s with `.rows` — no boxed panes, no pane titles in borders.
- `PowerChart`: keep behaviour; colours `--go` for measured (solid) and `--ink-2` dashed for estimated, grid lines `--line`, no glow/filters.
- `NewServer`: form fields with `.field`, the install command in a mono block with a copy button.

- [ ] **Step 1–3:** implement; browser check each route at 1440 and 390; lint/tsc/build; commit "Restyle server pages as panels".

---

### Task 7: Panel pages — recommendation, consultation (approval)

Depends on Task 4. Parallel with 6 and 8.

**Files:**
- Modify: `front/src/pages/Recommendation.tsx`, `front/src/pages/Consultation.tsx`, `front/src/components/Session.tsx`
- Create: `front/src/styles/consult.css`

Requirements:
- `<Panel title=... back={{ to: `/servers/${serverId}`, label: serverName or "서버" }}>`.
- Approval rows: the exact command in mono at 15px on a dark inset block, never truncated (wrap); risk tier tag (`TIER_LABEL`), undo command beneath in mono `--ink-2`; `허용` `.btn-go` and `거절` `.btn-quiet`. Pending rows have an amber left border; denied/blocked use `--bad` text.
- Live stream (`Session`): mono log, auto-scroll as today, no terminal chrome.
- Keep every existing action and state machine unchanged.

- [ ] **Step 1–3:** implement; browser check with a consultation that has pending, approved and denied calls (seed via SQL if needed); lint/tsc/build; commit "Restyle recommendation and consultation panels".

---

### Task 8: Panel pages — savings report, account, auth, errors

Depends on Tasks 1 and 4. Parallel with 6 and 7.

**Files:**
- Modify: `front/src/pages/Reports.tsx`, `front/src/pages/Account.tsx`, `front/src/components/AuthForm.tsx`, `front/src/pages/NotFound.tsx`, `front/src/pages/RouteError.tsx`
- Modify: `front/src/lib/types.ts` (`SavingsReport` gains `savedCo2KgMonth` on items and bySource, and `total`)
- Create: `front/src/styles/reports.css`, `front/src/styles/auth.css`

Requirements:
- Reports: top figures `이번 달 절약 {formatKrw(total.savedKrwMonth)}` and `{total.savedCo2KgMonth} kg CO₂`; per-action rows (server, action label, `.tag` 규칙/AI, `before → after W` with the 실측/추정 marker via `reportItemEstimated`, `₩/월`); per-server recommendation status; recent commands. Remove the rule-vs-AI comparison block. Empty state: one sentence + link to `/servers`.
- Account: profile, name/password forms, server list with rename/delete, delete account — same actions, `.section` layout.
- AuthForm (login/signup): no Panel; the scene shows the planet centred; the form sits right of centre on a `--surface` card (stacked under the planet on phones); only labels, inputs, button, and the login/signup switch link. Remove the trace SVG and lede text.
- NotFound / RouteError: small centred card over the scene with the message and one link/button.

- [ ] **Step 1–3:** implement; browser check; lint/tsc/build; commit "Restyle reports, account and auth".

---

### Task 9: Cleanup, slop pass, docs, ship

Depends on all.

- [ ] Remove `src/globals.css` and its import once no class from it is used (`grep` each page for old class names: `pane`, `meter-`, `fleet`, `console`, `gate`, `bar`); delete unused components (`Trace.tsx` if unused).
- [ ] Run the `kill-ai-slop` skill over `front/src` and fix what it finds within the Global Constraints.
- [ ] Update `front/DESIGN.md` to describe the orbit design (replace the console description).
- [ ] Full checks: front lint/tsc/test/build; back test. Browser pass at 1440×900 and 390×844 on every route, with reduced motion emulated, and with WebGL disabled (`--disable-webgl`).
- [ ] Get the user's review on local screenshots before pushing; then push `front` to `main` and confirm the Dokploy deploy on green.gsw226.xyz.
