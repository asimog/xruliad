"use client";

import React from "react";

export function BeliefTimeline({ steps }: { steps: Array<{ label: string; confidence: number; description: string }> }) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
      {steps.map((step, i) => (
        <div key={i} style={{ border: "1px solid rgba(124,228,210,.2)", borderRadius: 8, padding: 12, minWidth: 120, background: "rgba(4,16,14,.72)", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#888" }}>{step.label}</div>
          <div style={{ fontSize: 24, color: step.confidence > 0.5 ? "#7ce4d2" : "#fca5a5" }}>{(step.confidence * 100).toFixed(0)}%</div>
          <div style={{ fontSize: 11, color: "#888" }}>{step.description}</div>
        </div>
      ))}
    </div>
  );
}

export function ConfidenceShift({ before, after, reason }: { before: number; after: number; reason: string }) {
  const delta = after - before;
  const color = delta > 0.01 ? "#7ce4d2" : delta < -0.01 ? "#fca5a5" : "#e5e7eb";
  const arrow = delta > 0.01 ? "↑" : delta < -0.01 ? "↓" : "→";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid rgba(124,228,210,.2)", borderRadius: 8, background: "rgba(4,16,14,.72)" }}>
      <span style={{ color: "#888", fontSize: 14 }}>{(before * 100).toFixed(0)}%</span>
      <span style={{ color, fontSize: 20 }}>{arrow}</span>
      <span style={{ color: color, fontSize: 14, fontWeight: 600 }}>{(after * 100).toFixed(0)}%</span>
      <span style={{ color: "#b8d7d0", fontSize: 13, flex: 1 }}>{reason}</span>
    </div>
  );
}

export function BeliefProgressBar({ confidence, risk, label }: { confidence: number; risk: number; label: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: "#b8d7d0", fontSize: 12 }}>{label}</span>
        <span style={{ color: confidence > 0.5 ? "#7ce4d2" : "#fca5a5", fontSize: 12 }}>{(confidence * 100).toFixed(0)}%</span>
      </div>
      <div style={{ height: 8, background: "rgba(255,255,255,.1)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
        <div style={{ height: "100%", width: `${confidence * 100}%`, background: "linear-gradient(90deg, #7ce4d2, #49c5b6)", borderRadius: 4, transition: "width 0.3s ease" }} />
        <div style={{ position: "absolute", top: 0, left: `${(1 - risk) * 100}%`, width: 2, height: "100%", background: "#fca5a5" }} title={`Risk: ${(risk * 100).toFixed(0)}%`} />
      </div>
      <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>Risk: {(risk * 100).toFixed(0)}%</div>
    </div>
  );
}

export function RouteCostPanel({ provider, model, cost, paidViaPaySh }: { provider: string; model: string; cost: string; paidViaPaySh?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1px solid rgba(124,228,210,.2)", borderRadius: 6, background: "rgba(4,16,14,.72)", fontSize: 13 }}>
      <span style={{ color: "#c4b5fd" }}>{provider}</span>
      <span style={{ color: "#888" }}>→</span>
      <span style={{ color: "#effffb" }}>{model}</span>
      <span style={{ color: "#86efac", marginLeft: "auto" }}>{cost}</span>
      {paidViaPaySh && <span style={{ fontSize: 10, color: "#f9a8d4", border: "1px solid #f9a8d4", borderRadius: 4, padding: "2px 6px" }}>pay.sh</span>}
    </div>
  );
}

export function EvidenceMatrix({ items }: { items: Array<{ label: string; type: "supporting" | "counter"; weight: number }> }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ border: `1px solid ${item.type === "supporting" ? "rgba(124,228,210,.3)" : "rgba(252,165,165,.3)"}`, borderRadius: 6, padding: "8px 12px", background: item.type === "supporting" ? "rgba(124,228,210,.08)" : "rgba(252,165,165,.08)" }}>
          <div style={{ fontSize: 13, color: "#effffb" }}>{item.label}</div>
          <div style={{ fontSize: 11, color: item.type === "supporting" ? "#7ce4d2" : "#fca5a5" }}>{item.type === "supporting" ? "+" : "-"}{item.weight.toFixed(1)}</div>
        </div>
      ))}
    </div>
  );
}
