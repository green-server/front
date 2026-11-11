# Tree redesign

Approved 2026-11-11. Replaces the Orbit design (2026-11-09) everywhere: the deep-space 3D planet becomes one flat-illustrated tree on cream paper. The page structure, routes, panels and data stay as they are.

## Rules

- Light only: cream paper background, no dark theme. AA contrast for all text on cream.
- Flat illustration: rounded shapes, solid fills, no gradients, glow or textures.
- Type stays: Paperlogy for UI, IBM Plex Mono for commands and logs only.
- Colour roles stay: one green for "good" and primary actions; amber and red only for risk and "needs attention". The tree's own greens, autumn yellows and browns are illustration colours, not UI signals.
- Every W value keeps the 실측/추정 marker.
- `prefers-reduced-motion`: no sway, no falling leaves, instant transitions.
- Nothing decorative that does not show real data or lead to an action.

## Removed

- `OrbitScene`, `planetShaders`, the three.js dependency, `public/earth/*`, `public/planet.png`, the no-WebGL fallback.
- Live clouds, the real sun, the server location pin, hover blink, mouse drag.
- The server's location stays as text only, in the server panel's state line ("Seongnam-si, KR (IP 추정)"). The backend lookup is unchanged.

## Structure

| Unit | Responsibility |
|---|---|
| `lib/tree.ts` | Pure mapping from data to drawing: `treeState(health, blight)` gives leaf count, leaf colour mix, falling-leaf rate, dead-branch count and litter count; `layoutFruits(servers)` gives each server a fruit slot, radius, offline flag and whether it is labelled (top 8 by draw, the rest counted as "+n"). Deterministic: same data, same tree. |
| `lib/scene.ts` | The small store the pages write to (replaces `lib/orbit.ts`): `health`, `blight`, `fruits`, `panel`, `auth`. Same get/set/subscribe API. |
| `components/Tree.tsx` | The SVG tree. A fixed set of leaf clusters, dead-branch slots, litter slots and fruit slots drawn in one viewBox; state decides which are shown and how they are coloured. CSS animations for sway and falling leaves. |
| `components/TreeStage.tsx` | Fixed full-screen layer behind the pages that places the tree, and the fruit labels as HTML over the SVG in the same coordinate box. Fruits and labels are links to `/servers/:id`; hovering raises and outlines the fruit. |
| `TopBar`, `Panel`, `HomeHud`, pages | Unchanged in structure; restyled for cream paper. |

The stage places the tree with CSS only. Home: centred. Panel open: centred in the space left of the panel and sized to fit, using the same width expression as the panel, so window size and browser zoom move it with the panel. Sign-in: centred in the left half, the card in the right half. Phones (<760px): the tree sits small at the top, content below, panels as full-screen sheets.

## Tree and data

- **Leaves** follow `health` (fleet draw against its 7-day average, 0.5 = at the average). At or below the average the crown is full and deep green. Above it the crown thins and turns autumn yellow-brown, and leaves fall; at `health` 0 about a third of the clusters remain.
- **Dead branches and litter** follow `blight` (open recommendations, `1 - exp(-open / 8)`). Each step uncovers one more bare branch and one more patch of dry leaves on the ground, up to 6 branches and 8 patches. Fixing a recommendation removes one.
- **Fruits** are servers, in server id order across fixed slots in the crown. Radius scales with current W; offline fruits are grey. Up to 8 carry a label (name, W with 실측/추정); more servers show "+n", linking to `/servers`.
- **Worst case** is a nearly bare tree with a few brown clusters, never a dead one, so every fix still shows.
- Changes ease over about a second, so a new reading reads as weather, not a cut.

## Verification

- `npm run lint`, `tsc`, `npm test` (with tests for `lib/tree.ts`), `vite build`.
- Screenshots at 1440×900 and 390×844 for the four states (clear, high draw, open recommendations, both), a panel route, sign-in, and reduced motion.
- `three` gone from `package.json` and the bundle.
