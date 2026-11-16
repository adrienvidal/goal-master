import type { Metadata, Viewport } from "next";
import { Pixelify_Sans, Press_Start_2P, VT323 } from "next/font/google";
import { VersionWatcher } from "@/components/Banners";
import { Landscape } from "@/components/Landscape";
import { db } from "@/server/db";
import { currentUser } from "@/server/session";
import type { LandscapeId } from "@/lib/landscapes";
import { appVersion } from "@/lib/version";
import "./globals.css";

const pressStart = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-press-start" });
const pixelify = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixelify" });
const vt323 = VT323({ weight: "400", subsets: ["latin"], variable: "--font-vt323" });

export const metadata: Metadata = {
  title: "Goal Master",
  description: "100 candidatures. Un chevalier.",
  appleWebApp: { capable: true, title: "Goal Master", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#16132a" };

async function landscapeOf(): Promise<LandscapeId> {
  const user = await currentUser().catch(() => null);
  if (!user) return "CASTLE";
  const player = await db().player.findUnique({ where: { id: user.id }, select: { landscape: true } });
  return player?.landscape ?? "CASTLE";
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): Promise<React.ReactElement> {
  const landscape = await landscapeOf();
  return (
    <html lang="fr" className={`${pressStart.variable} ${pixelify.variable} ${vt323.variable}`}>
      <body className="min-h-dvh antialiased">
        <Landscape id={landscape} className="landscape-bg" />
        <div className="landscape-veil" />
        <VersionWatcher version={appVersion()} />
        {children}
      </body>
    </html>
  );
}
