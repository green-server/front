import { IBM_Plex_Mono, IBM_Plex_Sans_KR, Overpass_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const sans = IBM_Plex_Sans_KR({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  preload: false,
  variable: "--font-sans",
});
// Readings: signage-derived digits with a centred decimal point and a native ₩.
const numeric = Overpass_Mono({ subsets: ["latin"], variable: "--font-numeric" });
// Commands people approve: the dotted zero keeps 0/O and 1/l apart.
const code = IBM_Plex_Mono({ weight: "400", subsets: ["latin"], variable: "--font-code" });

// Each page renders its own <title>, so a route change is announced by name.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${sans.variable} ${numeric.variable} ${code.variable}`}>
      <body>{children}</body>
    </html>
  );
}
