import '@/app/globals.css';
import type { Metadata, Viewport } from 'next';
import { AppShell } from '@/components/app-shell';
import { MusicProvider } from '@/components/music-provider';
import { Providers } from '@/components/providers';
import { SiteBackground } from '@/components/site-background';
import { getSiteUrl } from '@/lib/env';
import { EcosystemBackground } from '@hypermyths/visuals';
import { MusicOrb, MusicOrbProvider } from '@hypermyths/music-orb';
import '@hypermyths/fonts/styles.css';
import '@hypermyths/visuals/styles.css';
import '@hypermyths/music-orb/styles.css';
import '@hypermyths/ui/styles.css';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'Hypertian',
    template: '%s | Hypertian',
  },
  description: 'Operational ad rails for X and Pump livestreams, with creator approval, on-chain payment verification, and OBS-ready overlays.',
  applicationName: 'Hypertian',
  keywords: ['livestream ads', 'PumpAds', 'X livestream ads', 'crypto ads', 'DexScreener', 'Solana', 'OBS overlays'],
  openGraph: {
    title: 'Hypertian',
    description: 'Operational ad rails for X and Pump livestreams.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hypertian',
    description: 'Operational ad rails for X and Pump livestreams.',
  },
  icons: {
    icon: '/icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#091216',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <MusicProvider>
            <MusicOrbProvider visualOnly defaultMuted>
              <EcosystemBackground productId="hypertian" />
              <MusicOrb label="Hypertian ecosystem music orb" />
            </MusicOrbProvider>
            <SiteBackground />
            <a className="skip-link" href="#main-content">
              Skip to content
            </a>
            <AppShell>{children}</AppShell>
          </MusicProvider>
        </Providers>
      </body>
    </html>
  );
}
