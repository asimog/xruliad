// Site footer — global
"use client";

import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav className="site-footer-links">
        <Link href="/terms" className="footer-nav-link">
          Terms
        </Link>
        <span className="footer-sep">·</span>
        <a
          href="https://github.com/asimog"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-nav-link"
        >
          GitHub
        </a>
        <span className="footer-sep">·</span>
        <a
          href="https://x.com/HyperMythX"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-nav-link"
        >
          @HyperMythX
        </a>
        <span className="footer-sep">·</span>
        <a
          href="https://t.me/HyperMythX"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-nav-link"
        >
          Telegram
        </a>
      </nav>
    </footer>
  );
}
