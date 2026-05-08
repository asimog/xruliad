'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { Eye, EyeOff, Pause, Play, TvMinimalPlay } from 'lucide-react';
import { isPrivyEnabled } from '@/lib/env';
import { useMusic } from '@/components/music-provider';

const NAV_ITEMS = [
  { href: '/streamer', label: 'Streamer' },
  { href: '/directory', label: 'Directory' },
  { href: '/feed', label: 'Feed' },
  { href: '/music', label: 'Music' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const privyEnabled = isPrivyEnabled();
  const pathname = usePathname();
  const isOverlayRoute = pathname?.startsWith('/overlay');
  const isHome = pathname === '/';

  if (isOverlayRoute) {
    return <>{children}</>;
  }

  return (
    <div className="relative z-10 min-h-screen">
      {!isHome ? (
        <header className="sticky top-0 z-40 px-4 pt-8 sm:px-5">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-1 py-1 relative md:flex-row md:items-center">
            <nav aria-label="Primary" className="flex flex-wrap items-center gap-1.5 md:absolute md:left-1/2 md:-translate-x-1/2">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <Link
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex min-h-9 items-center rounded-full border px-3.5 py-1.5 text-sm transition ${
                      active
                        ? 'border-[rgba(124,228,210,0.5)] bg-[rgba(124,228,210,0.13)] text-white'
                        : 'border-white/10 bg-white/[0.03] text-[var(--color-copy-soft)] hover:border-white/20 hover:bg-white/[0.06] hover:text-white'
                    }`}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 md:absolute md:right-4">
              {privyEnabled ? <PrivyAuthControls /> : null}
            </div>
          </div>
        </header>
      ) : null}
      <main className={isHome ? undefined : 'mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 pb-16 sm:px-5'} id="main-content">
        {children}
      </main>
      <FooterMusicControls />
      <AnimationToggle />
       <footer className="mx-auto grid w-full max-w-6xl gap-3 px-4 pb-8 sm:px-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
         <div aria-hidden="true" />
         <div className="flex flex-wrap items-center justify-center gap-2 text-base text-[var(--color-copy-faint)]">
           <Link className="text-[var(--color-copy-soft)] underline-offset-4 hover:text-white hover:underline" href="/terms">
             Terms
           </Link>
           <span aria-hidden>·</span>
           <a
             href="https://github.com/asimog"
             target="_blank"
             rel="noopener noreferrer"
             className="text-[var(--color-copy-soft)] underline-offset-4 hover:text-white hover:underline"
           >
             GitHub
           </a>
           <span aria-hidden>·</span>
           <a
             href="https://x.com/HyperMythX"
             target="_blank"
             rel="noopener noreferrer"
             className="text-[var(--color-copy-soft)] underline-offset-4 hover:text-white hover:underline"
           >
             @HyperMythX
           </a>
           <span aria-hidden>·</span>
           <a
             href="https://t.me/HyperMythX"
             target="_blank"
             rel="noopener noreferrer"
             className="text-[var(--color-copy-soft)] underline-offset-4 hover:text-white hover:underline"
           >
             Telegram
           </a>
           <span aria-hidden>·</span>
           <Link className="text-[var(--color-copy-soft)] underline-offset-4 hover:text-white hover:underline" href="/feedback">
             Feedback
           </Link>
           <span aria-hidden>·</span>
           <Link className="text-[var(--color-copy-soft)] underline-offset-4 hover:text-white hover:underline" href="/admin">
             Admin
           </Link>
         </div>
         <div aria-hidden="true" />
       </footer>
    </div>
  );
}

const ANIMATION_STORAGE_KEY = 'hypertian-animations-paused';
const ANIMATION_EVENT = 'hypertian-animation-toggle';

function FooterMusicControls() {
  const music = useMusic();
  const title = music.sourceKind === 'youtube' ? 'YouTube audio' : music.selectedTrack?.label ?? 'Music ready';

  return (
    <button
      aria-label={music.isPlaying ? `Pause music: ${title}` : `Play music: ${title}`}
      className={`global-play-pause-btn${music.isPlaying ? ' is-playing' : ''}`}
      onClick={() => void music.toggle()}
      title={music.isPlaying ? `Pause music: ${title}` : `Play music: ${title}`}
      type="button"
    >
      {music.isPlaying ? <Pause aria-hidden /> : <Play aria-hidden />}
    </button>
  );
}

function AnimationToggle() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setPaused(window.localStorage.getItem(ANIMATION_STORAGE_KEY) === 'true');
  }, []);

  function toggleAnimations() {
    const next = !paused;
    setPaused(next);
    window.localStorage.setItem(ANIMATION_STORAGE_KEY, String(next));
    window.dispatchEvent(new CustomEvent(ANIMATION_EVENT, { detail: { paused: next } }));
  }

  return (
    <button
      aria-label={paused ? 'Turn on animated background' : 'Turn off animated background'}
      className={`background-toggle-btn${paused ? ' is-off' : ''}`}
      onClick={toggleAnimations}
      title={paused ? 'Turn on animated background' : 'Turn off animated background'}
      type="button"
    >
      {paused ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
    </button>
  );
}

function PrivyAuthControls() {
  const { authenticated, login, logout, user } = usePrivy();

  if (authenticated) {
    return (
      <button
        aria-label="Disconnect"
        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[var(--color-copy-soft)] transition hover:border-white/20 hover:text-white"
        onClick={() => logout()}
        title={user?.email?.address || user?.twitter?.username || 'Wallet connected'}
        type="button"
      >
        Sign out
      </button>
    );
  }

  return (
    <button
      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[var(--color-copy-soft)] transition hover:border-white/20 hover:text-white"
      onClick={login}
      type="button"
    >
      Optional sign-in
    </button>
  );
}

export function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: 'wallet' | 'activity' | 'stream';
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="panel rounded-[16px] p-3">
      <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-copy-faint)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
      <p className="text-[11px] text-[var(--color-copy-soft)]">{hint}</p>
    </div>
  );
}
