import type { Metadata, Viewport } from "next";
import { Pixelify_Sans, Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-press-start" });
const pixelify = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixelify" });
const vt323 = VT323({ weight: "400", subsets: ["latin"], variable: "--font-vt323" });

export const metadata: Metadata = {
  title: "Goal Master",
  description: "100 candidatures. Un chevalier.",
};

export const viewport: Viewport = { themeColor: "#16132a" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return (
    <html lang="fr" className={`${pressStart.variable} ${pixelify.variable} ${vt323.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
