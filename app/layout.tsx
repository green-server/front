import { Doto, IBM_Plex_Mono, IBM_Plex_Sans_KR } from "next/font/google";
import localFont from "next/font/local";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ThemeScene } from "@/components/ThemeScene";
import { THEME_BOOT } from "@/lib/theme";
import "./globals.css";
import "./themes.css";

const sans = IBM_Plex_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
  variable: "--font-sans",
});
// Readings, set like the dot-matrix panel on a bench instrument.
const dot = Doto({ weight: ["700", "900"], subsets: ["latin", "latin-ext"], variable: "--font-dot" });
// Commands people approve: the dotted zero keeps 0/O and 1/l apart.
const code = IBM_Plex_Mono({ weight: ["400", "600"], subsets: ["latin"], variable: "--font-code" });
// Headings: a Korean bitmap face, the one voice nothing else on the web is using.
const pixel = localFont({ src: "./fonts/Galmuri11-Bold.woff2", variable: "--font-pixel", display: "swap" });

// No title here: each page renders its own, and a second one would replace it.
export const metadata: Metadata = {
  description: "내 서버가 쓰는 전기를 W와 ₩로 확인하고 AI로 낭비를 줄입니다.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#06090a" },
    { media: "(prefers-color-scheme: light)", color: "#e9ebe3" },
  ],
};

// Each page renders its own <title>, so a route change is announced by name.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${sans.variable} ${dot.variable} ${code.variable} ${pixel.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <ThemeScene />
        {children}
      </body>
    </html>
  );
}
