"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

import {
  ArrowRightIcon,
  FilmIcon,
  HomeIcon,
  TrendingIcon,
} from "@/components/ui/AppIcons";

const NAV_ITEMS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/media", label: "Trailer", Icon: FilmIcon },
  { href: "/chat", label: "Scanner", Icon: TrendingIcon },
  { href: "/feed", label: "Feed", Icon: TrendingIcon },
  { href: "/music", label: "Music", Icon: TrendingIcon },
  { href: "/creator", label: "Studio", Icon: FilmIcon },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isHomepage = pathname === "/";

  if (isHomepage) {
    return null;
  }

  return (
    <header className="site-header">
      <div className="site-header-shell">
        <div className="site-header-bar">
          <div className="site-brand-spacer" aria-hidden="true" />

          <nav className="site-nav desktop-nav site-nav--centered" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  className={`nav-link${isActive ? " nav-link-active" : ""}`}
                  href={item.href}
                >
                  <item.Icon className="nav-link-icon" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            <span className="mobile-menu-toggle-box" aria-hidden="true">
              <span
                className={`mobile-menu-toggle-line ${mobileMenuOpen ? "open" : ""}`}
              />
              <span
                className={`mobile-menu-toggle-line ${mobileMenuOpen ? "open" : ""}`}
              />
              <span
                className={`mobile-menu-toggle-line ${mobileMenuOpen ? "open" : ""}`}
              />
            </span>
            <span className="mobile-menu-toggle-label">Menu</span>
          </button>
        </div>

        {mobileMenuOpen && (
          <nav
            id="mobile-navigation"
            className="mobile-menu"
            aria-label="Mobile primary"
          >
            <Link
              className={`mobile-menu-link${pathname === "/" ? " mobile-menu-link-active" : ""}`}
              href="/"
              onClick={() => setMobileMenuOpen(false)}
            >
              <HomeIcon className="mobile-menu-link-icon" aria-hidden="true" />
              <span>Home</span>
              <ArrowRightIcon className="mobile-menu-link-arrow" aria-hidden="true" />
            </Link>
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  className={`mobile-menu-link${isActive ? " mobile-menu-link-active" : ""}`}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.Icon
                    className="mobile-menu-link-icon"
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                  <ArrowRightIcon
                    className="mobile-menu-link-arrow"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
