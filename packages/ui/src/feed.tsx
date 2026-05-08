"use client";

import React from "react";

export type FeedBadgeProps = { label: string; color?: string; icon?: string; className?: string };
export function FeedStatusBadge({ label, color, className }: FeedBadgeProps) {
  const colors: Record<string, string> = {
    complete: "#7ce4d2", running: "#f5c542", queued: "#93c5fd", failed: "#fca5a5", prepared: "#c4b5fd",
    sealed: "#86efac", published: "#f9a8d4", approved: "#7ce4d2", rejected: "#fca5a5", blocked: "#e5e7eb"
  };
  return <span style={{ border: `1px solid ${color ?? colors[label] ?? "#e5e7eb"}`, color: color ?? colors[label] ?? "#e5e7eb", borderRadius: 6, padding: "4px 8px", fontSize: 12 }} className={className}>{label}</span>;
}

export function FeedPrivacyBadge({ label, color, className }: FeedBadgeProps) {
  const colors: Record<string, string> = {
    transparent: "#7ce4d2", pseudonymous: "#f5c542", encrypted_actor: "#c4b5fd", encrypted_content: "#93c5fd",
    redacted_content: "#fdba74", commitment_only: "#fca5a5", local_only: "#e5e7eb"
  };
  return <span style={{ border: `1px solid ${color ?? colors[label] ?? "#e5e7eb"}`, color: color ?? colors[label] ?? "#e5e7eb", borderRadius: 6, padding: "4px 8px", fontSize: 12 }} className={className}>{label}</span>;
}

export function FeedProductBadge({ label, color, className }: FeedBadgeProps) {
  return <span style={{ border: "1px solid rgba(124,228,210,.32)", color: color ?? "#7ce4d2", borderRadius: 6, padding: "4px 8px", fontSize: 12 }} className={className}>{label}</span>;
}

export function EncryptedActorBadge({ className }: { className?: string }) {
  return <span style={{ border: "1px solid #c4b5fd", color: "#c4b5fd", borderRadius: 6, padding: "4px 8px", fontSize: 12 }} className={className}>encrypted actor</span>;
}

export function LocalOnlyBadge({ className }: { className?: string }) {
  return <span style={{ border: "1px solid #fca5a5", color: "#fca5a5", borderRadius: 6, padding: "4px 8px", fontSize: 12 }} className={className}>local only</span>;
}

export function FeedReceiptBadge({ label, className }: { label: string; className?: string }) {
  return <span style={{ border: "1px solid #86efac", color: "#86efac", borderRadius: 6, padding: "4px 8px", fontSize: 12 }} className={className}>{label}</span>;
}

export type FeedItemCardProps = {
  id: string;
  title: string;
  jobType: string;
  productId: string;
  status: string;
  privacyMode: string;
  safeSummary?: string;
  isLocal?: boolean;
  isEncrypted?: boolean;
  costUsd?: number;
  createdAt?: string;
  onClick?: () => void;
  className?: string;
};

export function FeedItemCard({ id, title, jobType, productId, status, privacyMode, safeSummary, isLocal, isEncrypted, costUsd, createdAt, onClick, className }: FeedItemCardProps) {
  return (
    <div onClick={onClick} style={{ border: "1px solid rgba(124,228,210,.2)", borderRadius: 8, padding: 16, background: "rgba(4,16,14,.72)", cursor: onClick ? "pointer" : "default" }} className={className}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <FeedProductBadge label={productId} />
        <FeedStatusBadge label={status} />
        <FeedPrivacyBadge label={privacyMode} />
        {isLocal && <LocalOnlyBadge />}
        {isEncrypted && <EncryptedActorBadge />}
        {costUsd !== undefined && <FeedReceiptBadge label={`$${costUsd.toFixed(2)}`} />}
      </div>
      <h3 style={{ margin: "8px 0 4px", fontSize: 16, color: "#effffb" }}>{title}</h3>
      {safeSummary && <p style={{ color: "#b8d7d0", fontSize: 14, margin: 0 }}>{safeSummary}</p>}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: "#888", fontSize: 12 }}>
        <span>{jobType}</span>
        {createdAt && <span>{new Date(createdAt).toLocaleString()}</span>}
      </div>
    </div>
  );
}

export type UnifiedFeedProps = {
  title: string;
  items: FeedItemCardProps[];
  emptyMessage?: string;
  className?: string;
};

export function UnifiedFeed({ title, items, emptyMessage = "No feed items yet.", className }: UnifiedFeedProps) {
  return (
    <div className={className} style={{ maxWidth: 1040, margin: "0 auto" }}>
      <h2 style={{ color: "#effffb", fontSize: 24, marginBottom: 20 }}>{title}</h2>
      {items.length === 0 ? (
        <p style={{ color: "#b8d7d0" }}>{emptyMessage}</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((item) => <FeedItemCard key={item.id} {...item} />)}
        </div>
      )}
    </div>
  );
}
