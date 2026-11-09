# Orbit redesign

Approved 2026-11-09. Replaces the console look (DESIGN.md) with one 3D scene: the live planet in the middle, servers as satellites on a ring, every other screen a panel that slides over the scene.

Reference mockup: the "1 · 궤도" concept (1440×900), trimmed as below.

## Rules

- Nothing that does not show real data or lead to an action. No decorative captions (no English HUD labels, no "지구 상태: 맑음", no tree metaphors, no tagline copy), no corner brackets, no gradients or glow, no fly-in effects.
- Palette: near-black navy space, white/light-grey text, one green for "good" and primary actions, amber and red only for risk and "needs attention". AA contrast for all text.
- Type: Paperlogy for UI, IBM Plex Mono for commands and logs only.
- Every W value keeps the 실측/추정 marker: solid underline + "실측", dashed underline + "추정".
- `prefers-reduced-motion`: no rotation, no camera moves, instant transitions.
- No WebGL: a static planet image stands in, and satellites become a plain list.

## Structure

URLs stay as they are; the route decides what the scene and panel show.

| Unit | Responsibility |
|---|---|
| `OrbitScene` | One full-screen three.js scene for the whole app: the existing planet shaders, one ring, satellites, camera. Lives above the router and never unmounts. Reads servers and planet health from a small store. |
| `SatelliteLabels` | HTML labels placed each frame from the satellites' projected 3D positions: name, W with 실측/추정, offline in grey. Clicking one goes to `/servers/:id`. |
| `TopBar` | Leaf logo + "Green Server", pill menu 홈 / 서버 / 절약 리포트 / 계정, online count, clock, 로그아웃. |
| `HomeHud` | Status line, two figures, approval notice. |
| `Panel` | Right-hand panel (~60% wide) for every non-home route, with close (→ `/`) and a breadcrumb for nested routes. Opening it moves the planet left and dims it. On phones it is a full-screen sheet. |

### Ring

- One ring. Satellites are spaced evenly; size and brightness scale with current W; offline servers are grey dots.
- More than 8 servers: the 8 with the highest draw get labels, the rest are unlabelled dots, and a "+n" chip opens `/servers`.
- `/servers` (new route) is the full server list in a panel.

## Screens

- **홈 `/`:** planet + ring; above the planet one line, "7일 평균보다 12% 적게" (or 많이); two figures, 지금 전체 전력 and 이번 달 예상 요금; the 승인 대기 notice top right only when something is pending. No servers: the planet plus a single "서버 연결하기" button.
- **서버 `/servers`:** list of all servers (name, kind, online, W, ₩/월), "서버 추가" button.
- **서버 상세 `/servers/:id`:** name, kind, online; current W; this month ₩, kWh, kg CO₂; power chart 1h/24h/7d (solid measured, dashed estimated); recommendations; top processes; AI consultation start; consultation history. Same data as today, in calm sections instead of boxed panes.
- **추천 `/servers/:id/recommendations/:rid` and 컨설팅 `/consultations/:id`:** nested in the panel with a "← 서버" breadcrumb. The approval view shows the exact command in mono, the risk tier, the undo command, 허용 (green) and 거절. Live log stream stays.
- **절약 리포트 `/reports`:** this month's saved ₩ and kg CO₂; per-action rows (server, action, source tag 규칙/AI, before → after W, ₩/월); per-server recommendation status; recent executed commands. No rule-vs-AI comparison block.
- **계정 `/account`:** profile, name and password change, server list with rename/delete, delete account.
- **서버 추가 `/servers/new`:** form, then the install command.
- **로그인 / 회원가입:** planet large, a small form beside it, no copy beyond labels.
- **Phones:** planet on top without the ring, the status line, the two figures, approvals, then the server list; panels are full-screen sheets; menu becomes a bottom tab bar.

## Backend

- CO₂ uses Korea's grid emission factor, 0.4594 kg CO₂/kWh, as one constant in `back/src/fees.ts`.
- `ServerSummary` gains `monthlyCo2Kg` (monthlyKwh × factor, 2 decimals).
- Savings report items gain `savedCo2KgMonth`; `bySource` and a new top-level `total` carry `savedCo2KgMonth` as well.
- `plan/docs/api.md` documents the fields. Tests cover both.

## Out of scope

Camera tracking of individual satellites, multiple rings, carbon on the home screen, theme switching (the scene is dark; light mode only keeps text readable).

## Verification

- `npm run lint`, `tsc`, `npm test`, `vite build` in front; `npm test` in back.
- Browser check at 1440×900 and 390×844 for every route, reduced motion on, and with WebGL disabled.
- A final `kill-ai-slop` pass over the front before shipping.
