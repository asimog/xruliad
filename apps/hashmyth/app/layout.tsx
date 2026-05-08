import type { Metadata, Viewport } from "next";
import "@hypermyths/fonts/styles.css";
import "@hypermyths/visuals/styles.css";
import "@hypermyths/music-orb/styles.css";
import "@hypermyths/ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "HashMyth",
  description: "Video generation from tokens, wallets, X profiles, market theses, research reports, simulations, and ads."
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0a0a1a"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="hypermyths-fonts">{children}</body>
    </html>
  );
}
