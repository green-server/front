const FONT_CSS = "https://fonts.googleapis.com/css2?display=swap&family=";

// Fonts load only for the chosen theme: the default stays free of Korean webfont CSS.
export const THEMES = [
  { value: "console", label: "콘솔", fonts: "" },
  { value: "space", label: "우주", fonts: `${FONT_CSS}Orbit&family=Michroma&family=IBM+Plex+Sans+KR:wght@400;500;700` },
  { value: "aurora", label: "오로라", fonts: `${FONT_CSS}Cormorant+Garamond:wght@300;400;500&family=Gowun+Batang:wght@400;700` },
  { value: "abyss", label: "심해", fonts: `${FONT_CSS}Saira+Condensed:wght@400;500;600&family=Gothic+A1:wght@400;500;700` },
  { value: "lava", label: "용암", fonts: `${FONT_CSS}Big+Shoulders+Display:wght@700;800&family=Hahmlet:wght@400;500;700` },
  { value: "modern", label: "모던", fonts: `${FONT_CSS}Geist:wght@400..700&family=Geist+Mono:wght@400;500` },
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
