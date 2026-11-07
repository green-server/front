# Design

Console below is the default theme. `app/themes.css` holds the other worlds: 우주, 오로라, 심해, 용암. A theme is tokens plus overrides on the same markup; components never branch on it. Status colours and the solid/dashed 실측·추정 rule hold in every theme. Fonts load only for the chosen theme.

Every world is a real place, rendered rather than decorated: `components/scenes.ts` holds a WebGL2 shader for each, and `components/ThemeScene.tsx` draws it at a low frame rate, pauses in hidden tabs, stops under reduced motion and falls back to the theme's CSS background. Physics is the brief: 오로라 uses oxygen and nitrogen emission colours on thin vertical sheets, 심해 is lit only by the vehicle's two lamps over a manganese nodule field, 용암 follows a blackbody ramp. Costume themes that only change colours and shapes do not belong here.

A bench scope wired into a tmux session. Dark is the scope in a dim room; light is the same readings on a thermal printout.

- **Colour:** tokens at the top of `app/globals.css`. Green means watts and "go". Amber and red are state only, never decoration. Only the live trace may glow.
- **Type:** Doto for display readings, Galmuri11 Bold for headings at 12px multiples, IBM Plex Sans KR for prose, IBM Plex Mono for data and commands. Doto's `.` reads as `+` and its `₩` is oversized, so `Power` and `Krw` set those glyphs apart.
- **Shape:** panes are 1px boxes with the title in the border. No radius, no shadows.
- **Navigation:** the bottom bar is the only nav. Its window numbers are real keys.
- **Data:** every decoration draws real data. No fake streams. Solid rule is 실측, dashed rule is 추정, on every reading and trace.
- **Logo:** a leaf with three rack slots, `components/Logo.tsx`. The mark is `--logo-mark`, the wordmark `currentColor`; `app/icon.svg` is the favicon.
- **Layout:** server channels share the screen height, so one server is a full-screen scope.
- **Motion:** the authored moment is a reading arriving: current runs down the trace, the tip lights, changed digits roll. Everything else is short continuity: routes rise in, gauges fill, disclosures open by height, themes spread from the picker. All of it honours reduced motion, and no value depends on an animation.
