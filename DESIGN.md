# Design

Console below is the default theme. `app/themes.css` holds the other worlds: 우주, 아케이드, 설계도, 팝. A theme is tokens plus overrides on the same markup; components never branch on it. Status colours and the solid/dashed 실측·추정 rule hold in every theme. Fonts load only for the chosen theme. 우주 is rendered, not decorated: `components/SpaceScene.tsx` ray-marches the atmosphere in a WebGL2 shader at a low frame rate, pauses in hidden tabs, and falls back to the CSS sky. In 아케이드 bitmap text must stay at 12px bold or 15px, or strokes vanish.

A bench scope wired into a tmux session. Dark is the scope in a dim room; light is the same readings on a thermal printout.

- **Colour:** tokens at the top of `app/globals.css`. Green means watts and "go". Amber and red are state only, never decoration. Only the live trace may glow.
- **Type:** Doto for display readings, Galmuri11 Bold for headings at 12px multiples, IBM Plex Sans KR for prose, IBM Plex Mono for data and commands. Doto's `.` reads as `+` and its `₩` is oversized, so `Power` and `Krw` set those glyphs apart.
- **Shape:** panes are 1px boxes with the title in the border. No radius, no shadows.
- **Navigation:** the bottom bar is the only nav. Its window numbers are real keys.
- **Data:** every decoration draws real data. No fake streams. Solid rule is 실측, dashed rule is 추정, on every reading and trace.
- **Logo:** a leaf with three rack slots, `components/Logo.tsx`. The mark is `--logo-mark`, the wordmark `currentColor`; `app/icon.svg` is the favicon.
- **Layout:** server channels share the screen height, so one server is a full-screen scope.
- **Motion:** one sweep when a chart first draws, one ring per incoming sample, and only changed digits roll.
