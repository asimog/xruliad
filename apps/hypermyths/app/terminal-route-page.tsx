import Link from "next/link";

type Badge = "Web available" | "Local only" | "Hybrid available" | "Requires QVAC" | "Requires local gateway" | "Requires approval" | "Platform payment" | "User-local payment" | "GitHub App" | "RBM Belief";

const badgeTone: Record<Badge, string> = {
  "Web available": "#7ce4d2",
  "Local only": "#f5c542",
  "Hybrid available": "#93c5fd",
  "Requires QVAC": "#c4b5fd",
  "Requires local gateway": "#fca5a5",
  "Requires approval": "#fdba74",
  "Platform payment": "#86efac",
  "User-local payment": "#f9a8d4",
  "GitHub App": "#e5e7eb",
  "RBM Belief": "#fbbf24"
};

export function TerminalRoutePage(props: { title: string; summary: string; badges: Badge[]; items: string[] }) {
  return (
    <main style={{ minHeight: "100vh", padding: "96px 24px 48px", color: "#effffb", background: "radial-gradient(circle at top, rgba(73,197,182,.22), transparent 35%), #050807" }}>
      <section style={{ maxWidth: 1040, margin: "0 auto" }}>
        <Link href="/" style={{ color: "#7ce4d2", textDecoration: "none" }}>HyperMyths Terminal</Link>
        <h1 style={{ marginTop: 24, fontSize: 48, lineHeight: 1, letterSpacing: 0 }}>{props.title}</h1>
        <p style={{ maxWidth: 760, color: "#b8d7d0", fontSize: 18 }}>{props.summary}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "28px 0" }}>
          {props.badges.map((badge) => (
            <span key={badge} style={{ border: `1px solid ${badgeTone[badge]}`, color: badgeTone[badge], borderRadius: 6, padding: "7px 10px", fontSize: 13 }}>{badge}</span>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {props.items.map((item) => (
            <div key={item} style={{ border: "1px solid rgba(124,228,210,.2)", borderRadius: 8, padding: 16, background: "rgba(4,16,14,.72)" }}>{item}</div>
          ))}
        </div>
      </section>
    </main>
  );
}
