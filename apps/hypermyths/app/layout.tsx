import type { Metadata, Viewport } from "next";
import { DM_Sans, Fragment_Mono, VT323 } from "next/font/google";
import { GlobalBackgroundToggle } from "@/components/background/GlobalBackgroundToggle";
import { LazyCanvasLayers } from "@/components/background/LazyCanvasLayers";
import { PrivyAppProvider } from "@/components/auth/PrivyAppProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MusicEngineProvider } from "@/lib/music/audio/music-engine-provider";
import { GlobalMusicInitializer } from "@/components/music/GlobalMusicInitializer";
import { GlobalPlayPauseButton } from "@/components/music/GlobalPlayPauseButton";
import { VisualBackgroundProvider } from "@/lib/ui/visual-background-provider";
import { EcosystemBackground } from "@hypermyths/visuals";
import { MusicOrb, MusicOrbProvider } from "@hypermyths/music-orb";
import "@hypermyths/fonts/styles.css";
import "@hypermyths/visuals/styles.css";
import "@hypermyths/music-orb/styles.css";
import "@hypermyths/ui/styles.css";
import "./globals.css";

const uiFont = DM_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const displayFont = VT323({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
});

const monoFont = Fragment_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "HyperMyths Terminal",
  description:
    "One terminal to operate video, intelligence, ads, research, predictions, commands, and local trade intents.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "HyperMyths Terminal",
    description:
      "One terminal to operate video, intelligence, ads, research, predictions, commands, and local trade intents.",
    siteName: "HyperMyths Terminal",
    images: [
      {
        url: "/logo.png",
        alt: "HyperMyths Terminal",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${uiFont.variable} ${displayFont.variable} ${monoFont.variable} antialiased`}>
        <PrivyAppProvider>
          <MusicEngineProvider>
            <VisualBackgroundProvider>
              <GlobalMusicInitializer />
              <MusicOrbProvider visualOnly defaultMuted>
                <EcosystemBackground productId="hypermyths" />
                <MusicOrb label="HyperMyths ecosystem music orb" />
              </MusicOrbProvider>
              <LazyCanvasLayers />
              <GlobalPlayPauseButton />
              <GlobalBackgroundToggle />
              <div id="wrapper">
                <SiteHeader />
                <main>{children}</main>
                <SiteFooter />
              </div>
            </VisualBackgroundProvider>
          </MusicEngineProvider>
        </PrivyAppProvider>
      </body>
    </html>
  );
}
