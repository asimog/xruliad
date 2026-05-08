import type { Metadata, Viewport } from "next";
import "@hypermyths/fonts/styles.css";
import "@hypermyths/visuals/styles.css";
import "@hypermyths/music-orb/styles.css";
import "@hypermyths/ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Polymyths",
  description: "Narrative intelligence, predictions, and testable market scenarios."
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#070706"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="hypermyths-fonts">{children}</body>
    </html>
  );
}
