"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/chat", label: "CHAT" },
  { href: "/media", label: "MEDIA" },
  { href: "/feed", label: "FEED" },
] as const;

export function ThreePageShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="atlas-shell">
      <header className="atlas-nav-wrap">
        <div className="atlas-nav">
          <Link href="/chat" className="atlas-brand">
            HYPERMYTHS
          </Link>

          <nav className="atlas-links" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`atlas-link${active ? " atlas-link--active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="atlas-main">{children}</main>
    </div>
  );
}
