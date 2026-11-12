# Design

A terminal on black: one character grid for everything, the fleet's tree drawn in ASCII in the middle, and every screen other than home a framed panel beside it.

- **Rule:** nothing appears unless it shows real data or leads to an action. No decorative captions, taglines, gradients, glow, radii or shadows.
- **Grid:** one monospace face, D2Coding (OFL, subset woff2 in `fonts/`), for all text. Latin is half a cell (`1ch` = 0.5em), Hangul a whole one, so `ch` and `lh` are the layout units.
- **Tree:** `components/Tree.tsx` draws `TREE_ART` from `lib/tree.ts` (48 × 24 characters) in a `<pre>`. `TREE_MASK` tags every cell with its part: trunk, one of 22 leaf clusters, 6 dead branches, 8 litter patches. `treeState(health, blight)` decides which parts show: drawing above the fleet's 7-day average thins the crown from the rim, turns it amber and drops `'` leaves; every open recommendation bares a branch and litters the ground. The tree's greens, ambers and browns are illustration colours, not UI signals.
- **Fruits:** servers, in id order, on fixed crown cells (`FRUIT_SLOTS`). `o` / `O` / `@` in gold by draw, `·` grey when offline; each links to its server. On home the 8 highest-draw carry a label on the crown's outer side (name, W with 실측/추정); the rest are a `+n` link to `/servers`. Phones show the tree smaller, above the content, without labels.
- **Frames:** `.frame` and the panel draw a 1px line through the middle of the edge cells, where box-drawing glyphs draw their strokes, so titles on the top line and `├┤` rules meet it at any width. Panels: `← 서버 › 이름` on the top line, `[x]` on the right; only the body scrolls.
- **Controls:** buttons are `[ 승인 ]`, reversed on hover and focus; the primary is filled `--go`. Menus, range pickers and filters reverse the current item. Radios are `( )` / `(•)`; fields sit on a `─` line; disclosure carets are `▸` / `▾`; commands are framed with a `$` prompt.
- **Palette:** tokens at the top of `styles/base.css`. `--paper` background, `--line` frames, `--ink` / `--ink-2` text, `--go` for good and the primary action (`--on-go` on it), `--warn` and `--bad` only for risk and things that need attention. All text meets AA; frame lines meet 3:1.
- **실측/추정:** every W value goes through `components/Power.tsx`: a solid underline and 실측 when measured, a leading `~`, dashed underline and 추정 when estimated. The chart draws measured slices in `▁…█` green and estimated ones in `░` grey. No reading is shown as a measured zero.
- **Chart:** `components/PowerChart.tsx`, block characters in a `<pre>` sized in columns from its width, 16 rows at the full-block glyph's height so stacked cells meet. Peak marked `▲` on the axis; a status line under it names the picked reading.
- **Motion:** only the falling leaves and the text caret move. Under `prefers-reduced-motion` nothing does.
- **Mark:** `❦` in `--go`, in the top bar and `public/icon.svg`.
