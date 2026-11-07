const FONT_CSS = "https://fonts.googleapis.com/css2?display=swap&family=";

// Fonts load only for the chosen theme: the default stays free of Korean webfont CSS.
export const THEMES = [
  { value: "console", label: "콘솔", fonts: "" },
  { value: "space", label: "우주", fonts: `${FONT_CSS}Orbit&family=Michroma&family=IBM+Plex+Sans+KR:wght@400;500;700` },
  { value: "arcade", label: "아케이드", fonts: `${FONT_CSS}Press+Start+2P` },
  { value: "blueprint", label: "설계도", fonts: `${FONT_CSS}Gaegu:wght@400;700&family=Architects+Daughter&family=Gowun+Dodum` },
  { value: "pop", label: "팝", fonts: `${FONT_CSS}Black+Han+Sans&family=Rubik+Mono+One&family=Gowun+Dodum` },
] as const;

export type Theme = (typeof THEMES)[number]["value"];

const KEY = "green-theme";
const LINK_ID = "theme-fonts";

function loadFonts(url: string) {
  document.getElementById(LINK_ID)?.remove();
  if (!url) return;
  const link = document.createElement("link");
  link.id = LINK_ID;
  link.rel = "stylesheet";
  link.href = url;
  document.head.append(link);
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  // Browser chrome follows the theme; the console default keeps its light and dark pair.
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.dataset.base ??= meta.content;
    meta.content = theme === "console" ? meta.dataset.base : getComputedStyle(document.documentElement).getPropertyValue("--ground");
  }
  loadFonts(THEMES.find((option) => option.value === theme)?.fonts ?? "");
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Private windows may refuse storage; the theme still applies for this page.
  }
  window.dispatchEvent(new Event("themechange"));
}

/** Runs before first paint, so a reload never flashes the default theme. */
export const THEME_BOOT = `(function(){try{var t=${JSON.stringify(Object.fromEntries(THEMES.map((o) => [o.value, o.fonts])))},v=localStorage.getItem(${JSON.stringify(KEY)});if(!v||!(v in t))return;var d=document.documentElement;d.dataset.theme=v;if(t[v]){var l=document.createElement("link");l.id=${JSON.stringify(LINK_ID)};l.rel="stylesheet";l.href=t[v];document.head.appendChild(l)}}catch(e){}})()`;
