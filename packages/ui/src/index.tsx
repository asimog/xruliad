"use client";

import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import type { ProductId } from "@hypermyths/theme";
import { getProduct } from "@hypermyths/theme";
import { EcosystemBackground } from "@hypermyths/visuals";
import { MusicOrb, MusicOrbProvider } from "@hypermyths/music-orb";

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`hmx-button ${className}`} {...props} />;
}

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`hmx-card ${className}`} {...props} />;
}

export function GlassPanel({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <section className={`hmx-glass-panel ${className}`} {...props} />;
}

export function SectionFrame({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`hmx-section-frame ${className}`} {...props} />;
}

export function Badge({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`hmx-badge ${className}`} {...props} />;
}

export const StatusBadge = Badge;

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`hmx-input ${className}`} {...props} />;
}

export function Modal({ children, open }: { children: ReactNode; open: boolean }) {
  if (!open) return null;
  return (
    <div className="hmx-modal" role="dialog" aria-modal="true">
      <div className="hmx-modal__panel">{children}</div>
    </div>
  );
}

export function Navbar({ productId }: { productId: ProductId }) {
  const product = getProduct(productId);
  return (
    <nav className="hmx-navbar" aria-label={`${product.displayName} navigation`}>
      <a className="hmx-navbar__brand" href="/">
        {product.displayName}
      </a>
      <div className="hmx-navbar__links">
        {product.navLinks.map((link) => (
          <a href={link.href} key={link.href}>
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function Footer({ productId }: { productId: ProductId }) {
  const product = getProduct(productId);
  return <footer className="hmx-footer">{product.displayName} · {product.domain}</footer>;
}

export function AppShell({
  productId,
  children,
  showNav = false,
  showOrb = true
}: {
  productId: ProductId;
  children: ReactNode;
  showNav?: boolean;
  showOrb?: boolean;
}) {
  const product = getProduct(productId);
  return (
    <MusicOrbProvider visualOnly defaultMuted>
      <EcosystemBackground productId={productId} />
      <div className="hmx-app-shell" style={{ "--ecosystem-accent": product.accent } as CSSProperties}>
        {showNav ? <Navbar productId={productId} /> : null}
        {children}
        {showOrb ? <MusicOrb label={`${product.displayName} music orb`} /> : null}
      </div>
    </MusicOrbProvider>
  );
}

export const ProductShell = AppShell;

export function Layout({ children }: { children: ReactNode }) {
  return <div className="hmx-layout">{children}</div>;
}

export function HeroSection({
  productId,
  title,
  children,
  action
}: {
  productId: ProductId;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const product = getProduct(productId);
  return (
    <section className="hmx-hero" data-product={productId}>
      <h1>{title}</h1>
      <p>{children}</p>
      {action ?? <a className="hmx-orbital-cta" href={product.primaryCta.href}>{product.primaryCta.label}</a>}
    </section>
  );
}

export function ProductCard({ productId }: { productId: ProductId }) {
  const product = getProduct(productId);
  return (
    <Card>
      <h3>{product.displayName}</h3>
      <p>{product.shortDescription}</p>
      <a href={product.primaryCta.href}>{product.primaryCta.label}</a>
    </Card>
  );
}

export function SignalCard({ title, children }: { title: string; children: ReactNode }) {
  return <Card><h3>{title}</h3><p>{children}</p></Card>;
}

export const QuestCard = SignalCard;
export const MarketCard = SignalCard;
export const DataPanel = SignalCard;

export function IntelligencePanel({ children }: { children: ReactNode }) {
  return <GlassPanel><div className="hmx-intelligence-panel">{children}</div></GlassPanel>;
}

export function OrbitalCTA({ href, children }: { href: string; children: ReactNode }) {
  return <a className="hmx-orbital-cta" href={href}>{children}</a>;
}

export function Table(props: HTMLAttributes<HTMLTableElement>) {
  return <table className="hmx-table" {...props} />;
}

export function Toast({ children }: { children: ReactNode }) {
  return <div className="hmx-toast" role="status">{children}</div>;
}

export {
  FeedStatusBadge,
  FeedPrivacyBadge,
  FeedProductBadge,
  EncryptedActorBadge,
  LocalOnlyBadge,
  FeedReceiptBadge,
  FeedItemCard,
  UnifiedFeed
} from "./feed";

export { BeliefTimeline, ConfidenceShift, BeliefProgressBar, RouteCostPanel, EvidenceMatrix } from "./belief";

export type { FeedBadgeProps, FeedItemCardProps, UnifiedFeedProps } from "./feed";
