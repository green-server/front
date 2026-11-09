# Design

There is one look, below. Themes were tried and removed; the console is the product.

A bench scope wired into a tmux session. Dark is the scope in a dim room; light is the same readings on a thermal printout.

- **Colour:** tokens at the top of `app/globals.css`. Green means watts and "go". Amber and red are state only, never decoration. Only the live trace may glow.
- **Type:** Paperlogy (OFL, local woff2 in `app/fonts`, weights 400/600/700/800) for readings, headings at 12px multiples and prose; IBM Plex Mono for data and commands. `--dot` and `--pixel` alias `--sans`.
- **Shape:** panes are 1px boxes with the title in the border. No radius, no shadows.
- **Navigation:** the bottom bar is the only nav. Its window numbers are real keys.
- **Data:** every decoration draws real data. No fake streams. Solid rule is 실측, dashed rule is 추정, on every reading and trace.
- **Logo:** a mark only, no wordmark: a slim leaf with one curved vein, `components/Logo.tsx`, filled with `--logo-mark`. `app/icon.svg` is the favicon in the same shape.
- **Backdrop:** `components/Planet.tsx` draws a procedural three.js planet fixed behind every page, dimmed (opacity 0.6 dark, 0.35 light). Its look is `planetHealth` in `lib/planet.ts`: online servers' current draw against the sum of their `weekWatts`. At the 7-day average it is 0.5; a third below is lush (big seas, green land, blue air, more cloud and ice), a third above is parched (shrunk seas, brown land, orange haze). Signed out it is lush. No rotation under reduced motion; skipped without WebGL.
- **Layout:** server channels share the screen height, so one server is a full-screen scope.
- **Motion:** the authored moment is a reading arriving: current runs down the trace, the tip lights, changed digits roll. Everything else is short continuity: routes rise in, gauges fill, disclosures open by height. All of it honours reduced motion, and no value depends on an animation.
